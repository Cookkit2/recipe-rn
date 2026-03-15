import { Q } from "@nozbe/watermelondb";
import { pantryApi } from "../pantryApi";
import { database } from "~/data/db/database";

// Mock the dependencies
jest.mock("~/data/db/database", () => ({
  database: {
    write: jest.fn(async (cb: any) => cb()),
    collections: {
      get: jest.fn((name: any) => {
        if (name === "stock") {
          return {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn().mockResolvedValue([]),
            prepareCreate: jest.fn((updater: any) => {
              const record = {};
              updater(record);
              return record;
            }),
          };
        }
        if (name === "stock_category") {
          return {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn().mockResolvedValue([]),
          };
        }
        return {};
      }),
    },
    batch: jest.fn(async (...records: any[]) => records),
  },
}));

jest.mock("~/lib/supabase/supabase-client", () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { categories: [] }, error: null }),
    },
  },
}));

describe("pantryApi batch operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should format batch parameters correctly", async () => {
    const items = Array.from({ length: 5 }).map((_, i) => ({
      name: `Item ${i}`,
      quantity: 1,
      unit: "pcs",
      type: "pantry" as any,
    } as any));

    await pantryApi.addPantryItems(items);

    const stockCollection = database.collections.get("stock");
    expect(stockCollection.prepareCreate).toHaveBeenCalledTimes(5);
  });
});
