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

it("groups monthly waste data with local date arithmetic accurately for different times in the same month", async () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";

  try {
    // Create two dates in the same month but at different times
    // May 15, 2025, 08:30:00
    const date1 = new Date(2025, 4, 15, 8, 30, 0).getTime();
    // May 22, 2025, 14:45:00
    const date2 = new Date(2025, 4, 22, 14, 45, 0).getTime();

    const queryResult: { extend: jest.Mock; fetch: jest.Mock } = {
      extend: jest.fn(),
      fetch: jest.fn(async () => [
        {
          wasteDate: date1,
          quantityWasted: 2,
          estimatedCost: 5,
        },
        {
          wasteDate: date2,
          quantityWasted: 3,
          estimatedCost: 10,
        },
      ]),
    };
    queryResult.extend.mockReturnValue(queryResult);
    mockCollections.waste_log = {
      query: jest.fn(() => queryResult),
    };

    const repo = new WasteLogRepository();
    const result = await repo.getWasteOverTime(undefined, undefined, "month");

    // Should be grouped into a single month (May 2025)
    expect(result.length).toBe(1);

    // Expected date is May 1, 2025, 00:00:00
    const expectedDate = new Date(2025, 4, 1).getTime();
    expect(result[0]?.date).toBe(expectedDate);
    expect(new Date(result[0]!.date).toString()).toContain("Thu May 01 2025 00:00:00");

    // Sums should match
    expect(result[0]?.quantity).toBe(5);
    expect(result[0]?.cost).toBe(15);
    expect(result[0]?.count).toBe(2);
  } finally {
    process.env.TZ = previousTimezone;
  }
});
