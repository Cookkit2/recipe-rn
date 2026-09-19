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

// Mock the Q builder so we can assert the push path issues the indexed query
// shape (household_id + updated_at > lastSync) instead of fetch-all.
jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: jest.fn((col: string, op: unknown) => ({ col, op })),
    gt: jest.fn((value: number) => ({ gt: value })),
  },
}));

import { HouseholdSyncService } from "../HouseholdSyncService";
import { householdApi } from "~/data/supabase-api/HouseholdApi";
import { database as mockDb } from "~/data/db/database";
import { Q } from "@nozbe/watermelondb";

const stockCollection = (mockDb as any).__stockCollection;

function makeMockQueue() {
  return {
    drain: jest.fn().mockResolvedValue(0),
    enqueue: jest.fn(),
  };
}

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

describe("HouseholdSyncService pushLocalChanges — N+1 fix + write queue (issue #734)", () => {
  let service: HouseholdSyncService;
  let queue: ReturnType<typeof makeMockQueue>;

  beforeEach(() => {
    jest.clearAllMocks();
    queue = makeMockQueue();
    service = new HouseholdSyncService(queue as any);
  });

  it("queries stock by household_id + updated_at > lastSync (no fetch-all)", async () => {
    // lastSync from storage mock is 0, so Q.gt(0) selects anything newer than epoch.
    stockCollection.fetch.mockResolvedValueOnce([]);

    await (service as any).pushLocalChanges("household-1");

    // The collection's query() must have been called with the two Q.where clauses
    // — NOT a bare query().fetch() that pulls the whole collection.
    expect(stockCollection.query).toHaveBeenCalledTimes(1);
    const args = (stockCollection.query as jest.Mock).mock.calls[0] ?? [];
    // First clause: household_id = 'household-1'
    expect(args[0]).toEqual({ col: "household_id", op: "household-1" });
    // Second clause: updated_at > lastSync (Q.gt shape)
    expect(args[1]).toEqual({ col: "updated_at", op: { gt: 0 } });
    expect(Q.where).toHaveBeenCalledWith("household_id", "household-1");
    expect(Q.where).toHaveBeenCalledWith("updated_at", expect.any(Object));
  });

  it("no-ops (no upsert) when the indexed query returns no rows", async () => {
    stockCollection.fetch.mockResolvedValueOnce([]);

    await (service as any).pushLocalChanges("household-1");

    expect(householdApi.upsertSharedStock).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("enqueues the payload on upsert failure (does not silently drop the mutation)", async () => {
    const row = {
      supabaseId: "stock-1",
      id: "local-1",
      name: "Milk",
      quantity: 1,
      unit: "carton",
      updatedAt: new Date("2024-06-01T00:00:00.000Z"),
    };
    stockCollection.fetch.mockResolvedValueOnce([row]);
    (householdApi.upsertSharedStock as jest.Mock).mockRejectedValueOnce(new Error("network down"));

    // pushLocalChanges should re-throw after enqueueing so syncHousehold's
    // outer try/catch surfaces it (non-blocking) — but the payload survives.
    await expect((service as any).pushLocalChanges("household-1")).rejects.toThrow("network down");

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith(
      "household-1",
      expect.arrayContaining([expect.objectContaining({ id: "stock-1", name: "Milk" })])
    );
  });

  it("happy path: upserts rows and does not enqueue", async () => {
    const row = {
      supabaseId: "stock-1",
      id: "local-1",
      name: "Milk",
      quantity: 1,
      unit: "carton",
      updatedAt: new Date("2024-06-01T00:00:00.000Z"),
    };
    stockCollection.fetch.mockResolvedValueOnce([row]);

    await (service as any).pushLocalChanges("household-1");

    expect(householdApi.upsertSharedStock).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

describe("HouseholdSyncService syncHousehold — queue drain on reconnect (issue #734)", () => {
  it("drains the write queue before pushing new changes (non-blocking on drain failure)", async () => {
    const queue = makeMockQueue();
    queue.drain.mockResolvedValue(2); // 2 previously-failed payloads replayed
    const service = new HouseholdSyncService(queue as any);

    // push + pull both return empty (no rows, no remote items) so syncHousehold
    // completes after the drain.
    stockCollection.fetch.mockResolvedValue([]);
    (householdApi.getSharedStock as jest.Mock).mockResolvedValue([]);

    await service.syncHousehold("household-1");

    expect(queue.drain).toHaveBeenCalledTimes(1);
    expect(queue.drain).toHaveBeenCalledWith("household-1", expect.any(Function));
  });

  it("continues with push/pull even if the drain itself throws (non-blocking)", async () => {
    const queue = makeMockQueue();
    queue.drain.mockRejectedValue(new Error("drain exploded"));
    const service = new HouseholdSyncService(queue as any);

    stockCollection.fetch.mockResolvedValue([]);
    (householdApi.getSharedStock as jest.Mock).mockResolvedValue([]);

    // Must not reject — drain errors are caught and logged.
    await expect(service.syncHousehold("household-1")).resolves.toBeUndefined();
  });
});
