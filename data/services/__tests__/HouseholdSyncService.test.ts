/// <reference types="jest" />

// Mock database BEFORE importing the service under test.
jest.mock("~/data/db/database", () => {
  const stockCollection: any = {
    query: jest.fn().mockReturnThis(),
    fetch: jest.fn().mockResolvedValue([]),
    prepareCreate: jest.fn(),
  };
  return {
    database: {
      collections: {
        get: jest.fn((table: string) => (table === "stock" ? stockCollection : null)),
      },
      write: jest.fn(async (cb: any) => cb()),
      batch: jest.fn().mockResolvedValue(undefined),
      __stockCollection: stockCollection,
    },
  };
});

jest.mock("~/data/supabase-api/HouseholdApi", () => ({
  householdApi: {
    getSharedStock: jest.fn().mockResolvedValue([]),
    upsertSharedStock: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("~/data/storage/storage-factory", () => ({
  StorageFactory: {
    getInstance: () => ({ getString: () => "0", setString: jest.fn() }),
  },
}));

import { HouseholdSyncService } from "../HouseholdSyncService";
import { householdApi } from "~/data/supabase-api/HouseholdApi";
import { database as mockDb } from "~/data/db/database";

const stockCollection = (mockDb as any).__stockCollection;

function makeStockRow(overrides: Partial<any> = {}) {
  return {
    supabaseId: "stock-1",
    name: "Milk",
    quantity: 1,
    unit: "carton",
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    prepareUpdate: jest.fn(function (this: any, updater: any) {
      updater(this);
      return this;
    }),
    ...overrides,
  };
}

describe("HouseholdSyncService pullRemoteChanges — LWW guard (audit defect #1, HIGH)", () => {
  let service: HouseholdSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HouseholdSyncService();
  });

  it("preserves a fresher local edit and does NOT call prepareUpdate", async () => {
    // Local row was edited at 2024-01-10; remote row is staler at 2024-01-01.
    const localRow = makeStockRow({
      updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      quantity: 99, // local edit must survive
    });
    stockCollection.fetch.mockResolvedValueOnce([localRow]);

    (householdApi.getSharedStock as jest.Mock).mockResolvedValueOnce([
      {
        id: "stock-1",
        name: "Milk",
        quantity: 2, // staler remote value
        unit: "carton",
        updated_at: "2024-01-01T00:00:00.000Z", // older than local
      },
    ]);

    await (service as any).pullRemoteChanges("household-1");

    expect(localRow.prepareUpdate).not.toHaveBeenCalled();
    // local edit preserved
    expect(localRow.quantity).toBe(99);
    // nothing batched
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("applies a strictly newer remote row (happy path preserved)", async () => {
    const localRow = makeStockRow({
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      quantity: 1,
    });
    stockCollection.fetch.mockResolvedValueOnce([localRow]);

    (householdApi.getSharedStock as jest.Mock).mockResolvedValueOnce([
      {
        id: "stock-1",
        name: "Milk",
        quantity: 7, // newer remote value
        unit: "liter",
        updated_at: "2024-01-10T00:00:00.000Z", // strictly newer
        expiry_date: null,
        image_url: null,
        x: null,
        y: null,
        scale: null,
        household_id: "household-1",
        added_by_user_id: null,
      },
    ]);

    await (service as any).pullRemoteChanges("household-1");

    expect(localRow.prepareUpdate).toHaveBeenCalledTimes(1);
    expect(localRow.quantity).toBe(7);
    expect(localRow.unit).toBe("liter");
    // the guarded update was batched
    expect(mockDb.batch).toHaveBeenCalledTimes(1);
  });

  it("preserves a known local edit when the remote row has no updated_at (data-loss-safe)", async () => {
    // A remote row with an unknown updated_at must not clobber a known-fresher
    // local edit — defaulting to "keep the local row we know is fresh" is the
    // safe choice and avoids the silent-clobber the audit flagged.
    const localRow = makeStockRow({
      updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      quantity: 5,
    });
    stockCollection.fetch.mockResolvedValueOnce([localRow]);

    (householdApi.getSharedStock as jest.Mock).mockResolvedValueOnce([
      {
        id: "stock-1",
        name: "Milk",
        quantity: 3,
        unit: "carton",
        updated_at: null,
        expiry_date: null,
        image_url: null,
        x: null,
        y: null,
        scale: null,
        household_id: "household-1",
        added_by_user_id: null,
      },
    ]);

    await (service as any).pullRemoteChanges("household-1");

    expect(localRow.prepareUpdate).not.toHaveBeenCalled();
    expect(localRow.quantity).toBe(5);
  });
});
