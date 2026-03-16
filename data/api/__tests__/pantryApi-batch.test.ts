import { Q } from "@nozbe/watermelondb";
import { pantryApi } from "../pantryApi";
import { database } from "~/data/db/database";

// Mock the dependencies
jest.mock("~/data/db/database", () => ({
  __esModule: true,
  database: {
    write: jest.fn(async (cb: any) => cb()),
    collections: {
      get: jest.fn(),
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

    const stockCollection = database.collections.get("stock");
    expect(stockCollection.prepareCreate).toHaveBeenCalledTimes(5);
  });
});
