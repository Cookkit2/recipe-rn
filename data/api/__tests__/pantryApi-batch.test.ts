import { pantryApi } from "../pantryApi";
import { database } from "~/data/db/database";

const stocks: any[] = [];
let writeCount = 0;

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getAllStock: jest.fn(async () => stocks),
  },
}));

jest.mock("~/data/db/database", () => {
  const stockCollection = {
    create: jest.fn(async (updater: any) => {
      const draft: any = { id: `stock_${stocks.length + 1}` };
      updater(draft);
      stocks.push(draft);
      return draft;
    }),
    prepareCreate: jest.fn((updater: any) => {
      const draft: any = { id: `stock_prepared_${stocks.length + 1}` };
      updater(draft);
      return { _prepared: draft };
    }),
  };

  return {
    database: {
      collections: {
        get: (name: string) => (name === "stock" ? stockCollection : {}),
      },
      write: async (action: () => Promise<void> | void) => {
        writeCount++;
        await action();
      },
      batch: jest.fn(async (...records: any[]) => {
        records.forEach((r) => stocks.push(r._prepared));
      }),
    },
  };
});

jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe("pantryApi.addPantryItems performance", () => {
  beforeEach(() => {
    stocks.length = 0;
    writeCount = 0;
    jest.clearAllMocks();
  });

  it("should add multiple items", async () => {
    const items = Array.from({ length: 5 }).map((_, i) => ({
      steps_to_store: [] as any,
      image_url: "",
      category: "",
      background_color: "",
      category_id: "",
      expiration_date: "",
      price: 0,
      name: `Item ${i}`,
      quantity: 1,
      unit: "pcs",
      type: "pantry" as any,
    } as any));

    await pantryApi.addPantryItems(items as any);

    expect(stocks.length).toBeGreaterThan(0);
    expect(writeCount).toBe(1);

    // We expect 5 calls to create in the baseline version
    const stockCollection = database.collections.get("stock");
    expect(stockCollection.prepareCreate).toHaveBeenCalledTimes(5);
    expect(database.batch).toHaveBeenCalledTimes(1);

    // Once fixed, we would expect prepareCreate to be called 5 times
    // and database.batch to be called.
  });
});
