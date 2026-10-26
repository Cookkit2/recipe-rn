import { SyncWriteQueue } from "../SyncWriteQueue";

// Mock StorageFactory so the test never resolves the react-native-mmkv ESM
// import (the queue's default storage path goes through it). Tests inject an
// in-memory storage double via the constructor regardless.
jest.mock("~/data/storage/storage-factory", () => ({
  StorageFactory: {
    getInstance: () => ({ getString: () => null, setString: jest.fn() }),
  },
}));

jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), error: jest.fn() },
}));

/**
 * In-memory storage double that mimics the QueueStorage interface the queue
 * expects (getString/setString). Lets us assert persistence-across-restart
 * semantics without touching MMKV.
 */
function makeMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getString: jest.fn((key: string) => store.get(key) ?? null),
    setString: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    __store: store,
  };
}

describe("SyncWriteQueue", () => {
  it("enqueue persists a payload that survives a simulated restart (re-read)", () => {
    const storage = makeMemoryStorage();
    const queue1 = new SyncWriteQueue(storage);

    queue1.enqueue("household-A", [{ id: "s1", name: "Milk", household_id: "household-A" }]);

    expect(queue1.size()).toBe(1);

    // Simulate restart: construct a NEW queue over the SAME storage. The
    // previously-enqueued payload must still be there.
    const queue2 = new SyncWriteQueue(storage);
    expect(queue2.size()).toBe(1);
    expect(queue2.pendingFor("household-A")).toHaveLength(1);
    expect(queue2.pendingFor("household-A")[0]?.rows).toEqual([
      { id: "s1", name: "Milk", household_id: "household-A" },
    ]);
  });

  it("ignores empty row payloads (no point queueing nothing)", () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);
    queue.enqueue("household-A", []);
    expect(queue.size()).toBe(0);
  });

  it("drain empties successfully-replayed payloads and reports the count", async () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);

    queue.enqueue("household-A", [{ id: "s1", name: "Milk", household_id: "household-A" }]);
    queue.enqueue("household-A", [{ id: "s2", name: "Milk", household_id: "household-A" }]);
    queue.enqueue("household-B", [{ id: "s3", name: "Milk", household_id: "household-B" }]); // other household

    const push = jest.fn().mockResolvedValue(undefined);
    const drained = await queue.drain("household-A", push);

    expect(drained).toBe(2);
    expect(queue.pendingFor("household-A")).toHaveLength(0);
    // household-B untouched
    expect(queue.pendingFor("household-B")).toHaveLength(1);
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("drain re-queues a payload whose retries exhaust (no sleep), incrementing failures", async () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);
    queue.enqueue("household-A", [{ id: "s1", name: "Milk", household_id: "household-A" }]);

    const push = jest.fn().mockRejectedValue(new Error("network down"));
    // noSleep so the retry loop doesn't actually wait.
    const drained = await queue.drain("household-A", push, {
      sleep: async () => {},
    });

    expect(drained).toBe(0);
    const pending = queue.pendingFor("household-A");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.failures).toBe(1);
  });

  it("dead-letters a payload after it exceeds MAX_DEAD_LETTER_FAILURES, dropping it", async () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);
    queue.enqueue("household-A", [{ id: "s1", name: "Milk", household_id: "household-A" }]);

    const push = jest.fn().mockRejectedValue(new Error("network down"));

    // Each drain does maxAttempts=4 retries then re-queues with failures++.
    // After 12 cumulative failures the payload is dead-lettered (dropped).
    // Drain 11 times: failures goes 1..11 (still retained).
    for (let i = 0; i < 11; i++) {
      await queue.drain("household-A", push, { sleep: async () => {} });
    }
    expect(queue.pendingFor("household-A")).toHaveLength(1);
    expect(queue.pendingFor("household-A")[0]?.failures).toBe(11);

    // 12th drain: failures would reach 12 >= MAX_DEAD_LETTER_FAILURES -> dropped.
    await queue.drain("household-A", push, { sleep: async () => {} });
    expect(queue.pendingFor("household-A")).toHaveLength(0);
  });

  it("a terminal error during drain drops the payload's retries immediately without re-queue spam", async () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);
    queue.enqueue("household-A", [{ id: "s1", name: "Milk", household_id: "household-A" }]);

    // withRetryBackoff treats "Unauthorized" as terminal -> no retries, throws fast.
    const push = jest.fn().mockRejectedValue(new Error("Unauthorized"));
    const drained = await queue.drain("household-A", push, { sleep: async () => {} });

    expect(drained).toBe(0);
    // Only one call to push (no retries) because the error is terminal.
    expect(push).toHaveBeenCalledTimes(1);
    // Payload is re-queued with failures=1 (terminal just skips the retry loop,
    // it does not pre-judge dead-lettering — a future drain might still succeed).
    expect(queue.pendingFor("household-A")).toHaveLength(1);
    expect(queue.pendingFor("household-A")[0]?.failures).toBe(1);
  });

  it("drain is a no-op (returns 0) when nothing is queued for the household", async () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);
    const push = jest.fn();
    const drained = await queue.drain("household-A", push);
    expect(drained).toBe(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("isolates households: draining one does not touch another's payloads", async () => {
    const storage = makeMemoryStorage();
    const queue = new SyncWriteQueue(storage);
    queue.enqueue("household-A", [{ id: "s1", name: "Milk", household_id: "household-A" }]);
    queue.enqueue("household-B", [{ id: "s2", name: "Milk", household_id: "household-B" }]);

    const push = jest.fn().mockResolvedValue(undefined);
    await queue.drain("household-A", push);

    expect(queue.pendingFor("household-A")).toHaveLength(0);
    expect(queue.pendingFor("household-B")).toHaveLength(1);
  });
});

describe("catalog identity queue persistence", () => {
  const catalogId = "12345678-1234-4234-9234-123456789abc";
  const key = "household_sync_write_queue_v1";
  const row = { id: "s1", name: "Milk", household_id: "household-A" };
  const payload = (rows: unknown[]) => ({
    id: "push-1",
    householdId: "household-A",
    rows,
    failures: 0,
    enqueuedAt: 1,
  });

  it.each([catalogId, null, undefined])(
    "replays new payload identity %s across restart",
    async (identity) => {
      const storage = makeMemoryStorage();
      new SyncWriteQueue(storage).enqueue("household-A", [
        { ...row, ...(identity !== undefined ? { base_ingredient_id: identity } : {}) },
      ]);
      const push = jest.fn().mockResolvedValue(undefined);
      await new SyncWriteQueue(storage).drain("household-A", push);
      const replayed = push.mock.calls[0][0][0];
      if (identity === undefined) expect(replayed).not.toHaveProperty("base_ingredient_id");
      else expect(replayed.base_ingredient_id).toBe(identity);
    }
  );

  it("migrates old unconditional null to omission and persists the migration", () => {
    const storage = makeMemoryStorage();
    storage.__store.set(key, JSON.stringify([payload([{ ...row, base_ingredient_id: null }])]));
    const queue = new SyncWriteQueue(storage);
    expect(queue.pendingFor("household-A")[0]?.rows[0]).not.toHaveProperty("base_ingredient_id");
    expect(JSON.parse(storage.__store.get(key) ?? "null").version).toBe(2);
  });

  it.each(["temp-milk", 42, {}, []])("drops persisted invalid catalog refs %j", (identity) => {
    const storage = makeMemoryStorage();
    storage.__store.set(
      key,
      JSON.stringify({
        version: 2,
        payloads: [payload([{ ...row, base_ingredient_id: identity }])],
      })
    );
    expect(new SyncWriteQueue(storage).size()).toBe(0);
  });

  it.each([
    { ...row, household_id: "another-household" },
    { ...row, quantity: "one" },
    { ...row, name: null },
    { ...row, surprise: true },
  ])("rejects invalid persisted stock data %j", (invalidRow) => {
    const storage = makeMemoryStorage();
    storage.__store.set(key, JSON.stringify({ version: 2, payloads: [payload([invalidRow])] }));
    expect(new SyncWriteQueue(storage).size()).toBe(0);
  });
});
