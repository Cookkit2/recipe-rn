import { HouseholdSyncService } from "../data/services/HouseholdSyncService";

jest.mock("../lib/supabase/supabase-client", () => ({
  supabase: {},
}));
jest.mock("../data/supabase-api/HouseholdApi", () => ({
  householdApi: {
    getSharedStock: jest.fn(),
    upsertSharedStock: jest.fn(),
  },
}));
jest.mock("../data/db/database", () => {
  const mockFetch = jest.fn();
  const mockBatch = jest.fn();
  const mockPrepareUpdate = jest.fn();
  const mockPrepareCreate = jest.fn();

  return {
    database: {
      collections: {
        get: jest.fn(() => ({
          query: jest.fn(() => ({
            fetch: mockFetch,
          })),
          prepareCreate: mockPrepareCreate,
        })),
      },
      write: jest.fn(async (cb) => {
        await cb();
      }),
      batch: mockBatch,
    },
  };
});

jest.mock("../utils/logger", () => ({
  log: {
    error: jest.fn(),
  },
}));

jest.mock("../data/storage/storage-factory", () => ({
  StorageFactory: {
    getInstance: jest.fn(() => ({
      getString: jest.fn(() => "0"),
      setString: jest.fn(),
    })),
  },
}));

describe("HouseholdSyncService Benchmark", () => {
  it("measures performance", async () => {
    const NUM_REMOTE_ITEMS = 500;
    const NUM_LOCAL_ITEMS = 500;

    const mockItems = [];
    for (let i = 0; i < NUM_LOCAL_ITEMS; i++) {
      mockItems.push({
        id: `local_${i}`,
        supabaseId: `item_${i}`,
        prepareUpdate: jest.fn(),
      });
    }

    // Setup mock returns
    const db = require("../data/db/database").database;
    db.collections.get().query().fetch.mockResolvedValue(mockItems);

    const api = require("../data/supabase-api/HouseholdApi").householdApi;
    api.getSharedStock.mockResolvedValue(
      Array.from({ length: NUM_REMOTE_ITEMS }, (_, i) => ({
        id: `item_${i}`,
        name: `Item ${i}`,
        quantity: 1,
        unit: "pcs",
      }))
    );
    api.upsertSharedStock.mockResolvedValue();

    const householdSyncService = new HouseholdSyncService();

    const start = performance.now();
    await householdSyncService.syncHousehold("test_household");
    const end = performance.now();

    console.log(`Sync took: ${end - start} ms`);
    console.log(`Query fetch calls: ${db.collections.get().query().fetch.mock.calls.length}`);
  });
});
