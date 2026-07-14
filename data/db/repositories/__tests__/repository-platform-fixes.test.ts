const mockCollections: Record<string, any> = {};

jest.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

jest.mock("../../database", () => ({
  database: {
    collections: {
      get: jest.fn((tableName: string) => mockCollections[tableName]),
    },
    write: jest.fn((callback: () => unknown) => callback()),
    batch: jest.fn(),
  },
}));

import { CookingHistoryRepository } from "../CookingHistoryRepository";
import { WasteLogRepository } from "../WasteLogRepository";

describe("repository platform-safe aggregations", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockCollections)) {
      delete mockCollections[key];
    }
  });

  it("uses JS aggregation for most-cooked recipes on web/Loki instead of unsafe SQL", async () => {
    const historyRows = [
      { recipeId: "recipe-a", cookedAt: 1_000 },
      { recipeId: "recipe-b", cookedAt: 2_000 },
      { recipeId: "recipe-a", cookedAt: 3_000 },
    ];
    const queryResult = {
      fetch: jest.fn(async () => historyRows),
      unsafeFetchRaw: jest.fn(async () => {
        throw new Error("Loki should not use unsafeFetchRaw");
      }),
    };
    const query = jest.fn((...clauses: Array<{ type?: string }>) => {
      if (clauses.some((clause) => clause?.type === "sqlQuery")) {
        throw new Error("[Loki] Q.unsafeSqlQuery are not supported with LokiJSAdapter");
      }
      return queryResult;
    });
    mockCollections.cooking_history = {
      table: "cooking_history",
      query,
    };

    const repo = new CookingHistoryRepository();
    const result = await repo.getMostCookedRecipes(2);

    expect(result).toEqual([
      { recipeId: "recipe-a", cookCount: 2, lastCookedAt: 3_000 },
      { recipeId: "recipe-b", cookCount: 1, lastCookedAt: 2_000 },
    ]);
    expect(queryResult.fetch).toHaveBeenCalledTimes(1);
    expect(queryResult.unsafeFetchRaw).not.toHaveBeenCalled();
  });

  it("groups weekly waste data with local date arithmetic across DST boundaries", async () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";

    try {
      const queryResult: { extend: jest.Mock; fetch: jest.Mock } = {
        extend: jest.fn(),
        fetch: jest.fn(async () => [
          {
            wasteDate: new Date(2025, 2, 10).getTime(),
            quantityWasted: 2,
            estimatedCost: 5,
          },
        ]),
      };
      queryResult.extend.mockReturnValue(queryResult);
      mockCollections.waste_log = {
        query: jest.fn(() => queryResult),
      };

      const repo = new WasteLogRepository();
      const result = await repo.getWasteOverTime(undefined, undefined, "week");

      expect(result[0]?.date).toBe(new Date(2025, 2, 9).getTime());
      expect(new Date(result[0]!.date).toString()).toContain("Sun Mar 09 2025 00:00:00");
    } finally {
      process.env.TZ = previousTimezone;
    }
  });
});
