/// <reference types="jest" />

// Mock database BEFORE importing the service under test.
const stockCollection: any = {
  query: jest.fn().mockReturnThis(),
  fetch: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
};

jest.mock("~/data/db/database", () => ({
  database: {
    collections: {
      get: jest.fn((table: string) => (table === "stock" ? stockCollection : null)),
    },
    write: jest.fn(async (cb: any) => cb()),
  },
}));

jest.mock("~/lib/supabase/supabase-client", () => ({ supabase: null }));
jest.mock("~/auth/AuthStore", () => ({
  useAuthStore: { getState: () => ({ user: { id: "user-1" } }) },
}));

import { HouseholdRealtimeService } from "../HouseholdRealtimeService";

function makeExistingRow(overrides: Partial<any> = {}) {
  return {
    id: "local-1",
    supabaseId: "stock-1",
    name: "Milk",
    quantity: 1,
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    update: jest.fn(),
    destroyPermanently: jest.fn().mockResolvedValue(undefined),
    markAsDeleted: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("HouseholdRealtimeService.handleDelete — soft-delete guard (audit defect #2, HIGH)", () => {
  let service: HouseholdRealtimeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HouseholdRealtimeService();
  });

  it("soft-deletes (markAsDeleted) the local row and does NOT destroyPermanently", async () => {
    const existing = makeExistingRow();
    stockCollection.fetch.mockResolvedValueOnce([existing]);

    await (service as any).handleDelete({ id: "stock-1" });

    // The irreversible wipe must not happen on the realtime path.
    expect(existing.destroyPermanently).not.toHaveBeenCalled();
    // Instead the row is marked deleted so it disappears from queries but
    // remains recoverable in the DB.
    expect(existing.markAsDeleted).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the row is already absent locally", async () => {
    stockCollection.fetch.mockResolvedValueOnce([]);

    // Must not throw and must not attempt any write.
    await expect((service as any).handleDelete({ id: "missing" })).resolves.toBeUndefined();
  });
});

describe("HouseholdRealtimeService.handleUpdate — LWW guard (regression for shared resolver)", () => {
  let service: HouseholdRealtimeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HouseholdRealtimeService();
  });

  it("skips a remote update that is not strictly newer than the local row", async () => {
    const existing = makeExistingRow({
      updatedAt: new Date("2024-01-10T00:00:00.000Z"),
      quantity: 99,
    });
    stockCollection.fetch.mockResolvedValueOnce([existing]);

    await (service as any).handleUpdate({
      id: "stock-1",
      name: "Milk",
      quantity: 2, // staler
      unit: "carton",
      updated_at: "2024-01-01T00:00:00.000Z", // older than local
      expiry_date: null,
      image_url: null,
      x: null,
      y: null,
      scale: null,
      household_id: "h-1",
      added_by_user_id: null,
    });

    expect(existing.update).not.toHaveBeenCalled();
    expect(existing.quantity).toBe(99);
  });
});
