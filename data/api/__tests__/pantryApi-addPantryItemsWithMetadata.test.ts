// @ts-nocheck
import { pantryApi } from "../pantryApi";

// In-memory collections to simulate WatermelonDB
type Stock = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  expiryDate?: Date;
  storageType?: string;
  backgroundColor?: string;
  imageUrl?: string;
  update: (updater: (stock: Stock) => void) => Promise<void>;
};

const stocks: Stock[] = [];

const failingNames = new Set<string>();

const stockCollection = {
  create: jest.fn(async (updater: (stock: Stock) => void) => {
    throw new Error("create should not be called");
  }),
  prepareCreate: jest.fn((updater: (stock: Stock) => void) => {
    const draft: Stock = {
      id: `stock_${stocks.length + 1}`,
      name: "",
      quantity: 0,
      update: async () => {},
    };

    updater(draft);

    if (failingNames.has(draft.name)) {
      throw new Error("Simulated create failure");
    }

    draft.update = async (fn: (stock: Stock) => void) => {
      fn(draft);
    };

    stocks.push(draft);
    return draft;
  }),
};

jest.mock("~/data/db/DatabaseFacade", () => ({
  databaseFacade: {
    getAllStock: jest.fn(async () => stocks),
  },
}));

jest.mock("~/data/db/database", () => ({
  database: {
    collections: {
      get: (name: string) => {
        if (name === "stock") {
          return stockCollection;
        }

        // Minimal stubs for other collections used in implementation
        return {
          query: () => ({
            fetch: async () => [],
          }),
          create: jest.fn(async () => ({})),
          prepareCreate: jest.fn((updater) => {
            return { _type: "create", updater };
          }),
        };
      },
    },
    write: async (action: () => Promise<void> | void) => {
      await action();
    },
    batch: async (...ops: any[]) => {
      for (const op of ops) {
        if (op && op._type === "update") {
          op.updater(op.record);
        }
      }
    },
  },
}));

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("pantryApi.addPantryItemsWithMetadata", () => {
  beforeEach(() => {
    stocks.length = 0;
    failingNames.clear();
    jest.clearAllMocks();
  });

  it("returns empty array when given no items", async () => {
    const result = await pantryApi.addPantryItemsWithMetadata([]);
    expect(result).toEqual([]);
  });

  it("creates a new stock item for a new ingredient", async () => {
    const result = await pantryApi.addPantryItemsWithMetadata([
      {
        name: "Milk",
        quantity: 1,
        unit: "L",
        type: "fridge",
      } as any,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Milk");
    expect(stocks).toHaveLength(1);
    expect(stocks[0]?.quantity).toBe(1);
  });

  it("aggregates quantity for duplicate ingredient names (case-insensitive)", async () => {
    // Seed existing stock
    const existing: Stock = {
      id: "stock_1",
      name: "Eggs",
      quantity: 4,
      unit: "pcs",
      storageType: "fridge",
      backgroundColor: undefined,
      imageUrl: undefined,
      expiryDate: undefined,
      update: async (fn: (stock: Stock) => void) => {
        fn(existing);
      },
      prepareUpdate: jest.fn((fn: (stock: Stock) => void) => {
        return { _type: "update", updater: fn, record: existing };
      }),
    };
    stocks.push(existing);

    const result = await pantryApi.addPantryItemsWithMetadata([
      {
        name: "eggs",
        quantity: 2,
        unit: "pcs",
        type: "fridge",
      } as any,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name.toLowerCase()).toBe("eggs");
    expect(existing.quantity).toBe(6);
  });

  it("continues processing items when one creation fails", async () => {
    failingNames.add("BadItem");

    const result = await pantryApi.addPantryItemsWithMetadata([
      {
        name: "GoodItem",
        quantity: 1,
        unit: "kg",
        type: "pantry",
      } as any,
      {
        name: "BadItem",
        quantity: 1,
        unit: "kg",
        type: "pantry",
      } as any,
    ]);

    // Only the valid item should be created and returned
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("GoodItem");
    expect(stocks.map((s) => s.name)).toEqual(["GoodItem"]);
  });

  it("returns empty array when all items fail to create", async () => {
    failingNames.add("BadItem1");
    failingNames.add("BadItem2");

    const result = await pantryApi.addPantryItemsWithMetadata([
      {
        name: "BadItem1",
        quantity: 1,
        unit: "kg",
        type: "pantry",
      } as any,
      {
        name: "BadItem2",
        quantity: 1,
        unit: "kg",
        type: "pantry",
      } as any,
    ]);

    expect(result).toEqual([]);
    expect(stocks).toHaveLength(0);
  });
});
