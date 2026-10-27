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
    baseIngredientId: undefined as string | null | undefined,
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

describe("household stock catalog identity", () => {
  const catalogId = "12345678-1234-4234-9234-123456789abc";
  beforeEach(() => jest.clearAllMocks());

  it.each([catalogId, null, undefined, "temp-ingredient", "not-a-uuid"])(
    "pushes only a valid catalog reference or an explicit clear (%s)",
    async (baseIngredientId) => {
      const queue = makeMockQueue();
      const service = new HouseholdSyncService(queue as any);
      stockCollection.fetch.mockResolvedValueOnce([
        makeStockRow({ baseIngredientId, _raw: { _changed: "base_ingredient_id" } }),
      ]);
      await (service as any).pushLocalChanges("household-1");
      const row = (householdApi.upsertSharedStock as jest.Mock).mock.calls[0][0][0];
      if (baseIngredientId === catalogId || baseIngredientId === null) {
        expect(row.base_ingredient_id).toBe(baseIngredientId);
      } else {
        expect(row).not.toHaveProperty("base_ingredient_id");
      }
      expect(row.id).toBe("stock-1");
      expect(row.household_id).toBe("household-1");
    }
  );

  it.each([catalogId, null, undefined])(
    "pull updates preserve omission and apply %s",
    async (identity) => {
      const local = makeStockRow({ baseIngredientId: "87654321-1234-4234-9234-123456789abc" });
      stockCollection.fetch.mockResolvedValueOnce([local]);
      (householdApi.getSharedStock as jest.Mock).mockResolvedValueOnce([
        {
          id: "stock-1",
          name: "Milk",
          updated_at: "2024-02-01T00:00:00Z",
          ...(identity !== undefined ? { base_ingredient_id: identity } : {}),
        },
      ]);
      await (new HouseholdSyncService() as any).pullRemoteChanges("household-1");
      expect(local.baseIngredientId).toBe(
        identity === undefined ? "87654321-1234-4234-9234-123456789abc" : identity
      );
    }
  );

  it("pull creates retain the catalog identity without using it as the stock id", async () => {
    const created: Record<string, unknown> = {};
    stockCollection.fetch.mockResolvedValueOnce([]);
    stockCollection.prepareCreate.mockImplementationOnce((fn: (row: typeof created) => void) => {
      fn(created);
      return created;
    });
    (householdApi.getSharedStock as jest.Mock).mockResolvedValueOnce([
      {
        id: "remote-stock",
        name: "Milk",
        base_ingredient_id: catalogId,
      },
    ]);
    await (new HouseholdSyncService() as any).pullRemoteChanges("household-1");
    expect(created.baseIngredientId).toBe(catalogId);
    expect(created.supabaseId).toBe("remote-stock");
    expect(created).not.toHaveProperty("id");
  });
});

describe("legacy null catalog reference upload", () => {
  it.each(["", "quantity", "quantity,base_ingredient_id_suffix", "prefix_base_ingredient_id"])(
    "omits an unmarked migrated null for changed fields %s",
    async (changed) => {
      jest.clearAllMocks();
      stockCollection.fetch.mockResolvedValueOnce([
        makeStockRow({
          baseIngredientId: null,
          quantity: 3,
          _raw: { _changed: changed },
        }),
      ]);
      await (new HouseholdSyncService(makeMockQueue() as any) as any).pushLocalChanges(
        "household-1"
      );
      const row = (householdApi.upsertSharedStock as jest.Mock).mock.calls[0][0][0];
      expect(row).not.toHaveProperty("base_ingredient_id");
      expect(row.quantity).toBe(3);
    }
  );
  it("uploads a clear with an exact identity change marker", async () => {
    jest.clearAllMocks();
    stockCollection.fetch.mockResolvedValueOnce([
      makeStockRow({
        baseIngredientId: null,
        _raw: { _changed: "quantity,base_ingredient_id,updated_at" },
      }),
    ]);
    await (new HouseholdSyncService(makeMockQueue() as any) as any).pushLocalChanges("household-1");
    expect(
      (householdApi.upsertSharedStock as jest.Mock).mock.calls[0][0][0].base_ingredient_id
    ).toBeNull();
  });
});
