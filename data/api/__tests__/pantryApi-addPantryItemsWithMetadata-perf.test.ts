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

// Track the number of times `create` or `update` or `batch` is called
export const dbMetrics = {
  creates: 0,
  updates: 0,
  batches: 0,
};

const stockCollection = {
  create: jest.fn(async (updater: (stock: Stock) => void) => {
    dbMetrics.creates++;
    const draft: Stock = {
      id: `stock_${stocks.length + 1}`,
      name: "",
      quantity: 0,
      update: async (fn: (stock: Stock) => void) => {
        dbMetrics.updates++;
        fn(draft);
      },
    };

    updater(draft);

    stocks.push(draft);
    return draft;
  }),
  prepareCreate: jest.fn((updater: (stock: Stock) => void) => {
    return {
      _isPrepared: true,
      _type: "create",
      updater,
    };
  }),
};

const otherCollection = {
  query: () => ({
    fetch: async () => [],
  }),
  create: jest.fn(async () => {
    dbMetrics.creates++;
    return {};
  }),
  prepareCreate: jest.fn((updater) => {
    return {
      _isPrepared: true,
      _type: "create",
      updater,
    };
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
        return otherCollection;
      },
    },
    write: async (action: () => Promise<void> | void) => {
      await action();
    },
    batch: async (...operations: any[]) => {
      dbMetrics.batches++;
      for (const op of operations) {
        if (op && op._isPrepared) {
          if (op._type === "create") {
            const draft: any = {
              id: `item_${Math.random()}`,
              update: async (fn: any) => {
                dbMetrics.updates++;
                fn(draft);
              },
            };
            op.updater(draft);
            if (op.updater.toString().includes("quantity")) {
              stocks.push(draft);
            }
          } else if (op._type === "update") {
            op.updater(op.record);
          }
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

describe("pantryApi.addPantryItemsWithMetadata Performance", () => {
  beforeEach(() => {
    stocks.length = 0;
    dbMetrics.creates = 0;
    dbMetrics.updates = 0;
    dbMetrics.batches = 0;
    jest.clearAllMocks();
  });

  it("should measure performance", async () => {
    const items = [];
    for (let i = 0; i < 50; i++) {
      items.push({
        name: `TestItem${i}`,
        quantity: 1,
        unit: "pcs",
        type: "pantry",
        categories: [{ name: `Cat${i}` }],
        synonyms: [{ synonym: `Syn${i}` }],
      } as any);
    }

    const start = Date.now();
    await pantryApi.addPantryItemsWithMetadata(items);
    const end = Date.now();

    console.log(`Add 50 items with metadata took: ${end - start}ms`);
    console.log(
      `DB Metrics: Creates: ${dbMetrics.creates}, Updates: ${dbMetrics.updates}, Batches: ${dbMetrics.batches}`
    );
  });
});

describe("pantryApi.addPantryItemsWithMetadata Update Performance", () => {
  beforeEach(() => {
    stocks.length = 0;
    dbMetrics.creates = 0;
    dbMetrics.updates = 0;
    dbMetrics.batches = 0;
    jest.clearAllMocks();
  });

  it("should measure performance with existing items", async () => {
    // add initial
    const items = [];
    for (let i = 0; i < 50; i++) {
      items.push({
        name: `TestItem${i}`,
        quantity: 1,
        unit: "pcs",
        type: "pantry",
        categories: [{ name: `Cat${i}` }],
        synonyms: [{ synonym: `Syn${i}` }],
      } as any);
    }
    await pantryApi.addPantryItemsWithMetadata(items);

    // reset metrics
    dbMetrics.creates = 0;
    dbMetrics.updates = 0;
    dbMetrics.batches = 0;

    const start = Date.now();
    await pantryApi.addPantryItemsWithMetadata(items);
    const end = Date.now();

    console.log(`Update 50 items with metadata took: ${end - start}ms`);
    console.log(
      `DB Metrics: Creates: ${dbMetrics.creates}, Updates: ${dbMetrics.updates}, Batches: ${dbMetrics.batches}`
    );
  });
});
