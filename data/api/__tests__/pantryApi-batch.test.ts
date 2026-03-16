import { pantryApi } from "../pantryApi";
import { database } from "~/data/db/database";

// NOTE: `jest.mock(...)` is hoisted, so these must not be `const` initializations
// referenced by the mock factory (TDZ). We lazily initialize them inside the factory.
// eslint-disable-next-line no-var
var stockCollectionMock: any;
// eslint-disable-next-line no-var
var stockCategoryCollectionMock: any;

// Mock the dependencies
jest.mock("~/data/db/database", () => ({
  __esModule: true,
  database: {
    write: jest.fn(async (cb: any) => cb()),
    collections: {
      get: jest.fn((name: any) => {
        if (!stockCollectionMock) {
          stockCollectionMock = {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn().mockResolvedValue([]),
            prepareCreate: jest.fn((updater: any) => {
              const record: any = {
                id: "mock_stock_id",
                name: "",
                quantity: 0,
                unit: "",
                expiryDate: undefined,
                storageType: undefined,
                backgroundColor: undefined,
                imageUrl: undefined,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                synonyms: { fetch: jest.fn().mockResolvedValue([]) },
                stockCategories: { fetch: jest.fn().mockResolvedValue([]) },
              };
              updater(record);
              return record;
            }),
          };
        }

        if (!stockCategoryCollectionMock) {
          stockCategoryCollectionMock = {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn().mockResolvedValue([]),
          };
        }

        if (name === "stock") {
          return stockCollectionMock;
        }
        if (name === "stock_category") {
          return stockCategoryCollectionMock;
        }
        return {};
      }),
    },
    batch: jest.fn(async (...records: any[]) => records),
  },
}));

jest.mock("~/lib/supabase/supabase-client", () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { categories: [] }, error: null }),
    },
  },
}));

describe("pantryApi batch operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const stockCollection = {
      query: jest.fn().mockReturnThis(),
      fetch: jest.fn().mockResolvedValue([]),
      prepareCreate: jest.fn((updater: any) => {
        const record: any = {};
        updater(record);
        return record;
      }),
    };

    const stockCategoryCollection = {
      query: jest.fn().mockReturnThis(),
      fetch: jest.fn().mockResolvedValue([]),
    };

    (database.collections.get as jest.Mock).mockImplementation((name: any) => {
      if (name === "stock") return stockCollection;
      if (name === "stock_category") return stockCategoryCollection;
      return {};
    });
  });

  it("should format batch parameters correctly", async () => {
    const items = Array.from({ length: 5 }).map((_, i) => ({
      name: `Item ${i}`,
      quantity: 1,
      unit: "pcs",
      type: "pantry" as any,
      steps_to_store: [],
      image_url: null,
      category: null,
      background_color: null,
    }));

    await pantryApi.addPantryItems(items as any);

    const stockCollection = database.collections.get("stock") as any;
    expect(stockCollection.prepareCreate).toHaveBeenCalledTimes(5);
  });
});
