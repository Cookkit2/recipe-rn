import {
  getInstallAnchor,
  resetInstallAnchorForTesting,
  setInstallAnchorForTesting,
} from "../install-anchor";
import { storage } from "~/data";

jest.mock("~/data", () => {
  const store = new Map<string, unknown>();
  return {
    storage: {
      get: jest.fn((key: string) => store.get(key) ?? null),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
      }),
      delete: jest.fn((key: string) => {
        store.delete(key);
      }),
    },
  };
});

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "fixed-install-id-uuid"),
}));

describe("install-anchor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInstallAnchorForTesting();
  });

  it("materializes a fresh installId + installAnchorTs on first call and persists them", () => {
    const before = Date.now();
    const anchor = getInstallAnchor();
    const after = Date.now();

    expect(anchor.installId).toBe("fixed-install-id-uuid");
    expect(anchor.installAnchorTs).toBeGreaterThanOrEqual(before);
    expect(anchor.installAnchorTs).toBeLessThanOrEqual(after);
    expect(storage.set).toHaveBeenCalledWith("analytics:install_id", anchor.installId);
    expect(storage.set).toHaveBeenCalledWith("analytics:install_anchor_ts", anchor.installAnchorTs);
  });

  it("is idempotent: returns the persisted anchor on subsequent calls without rewriting", () => {
    const first = getInstallAnchor();
    const setCallsBefore = (storage.set as jest.Mock).mock.calls.length;

    const second = getInstallAnchor();

    expect(second).toEqual(first);
    expect((storage.set as jest.Mock).mock.calls.length).toBe(setCallsBefore);
  });

  it("reuses a previously persisted anchor across cold starts (cache reset)", () => {
    // First launch materializes + persists.
    const first = getInstallAnchor();
    resetInstallAnchorForTesting(); // simulate process restart (clears in-mem cache + storage)

    // Simulate the persisted values surviving the restart.
    setInstallAnchorForTesting(first);
    const second = getInstallAnchor();

    expect(second.installId).toBe(first.installId);
    expect(second.installAnchorTs).toBe(first.installAnchorTs);
  });

  it("setInstallAnchorForTesting overwrites both persisted and cached values", () => {
    getInstallAnchor(); // seed
    const fixture = { installId: "explicit", installAnchorTs: 12345 };
    setInstallAnchorForTesting(fixture);
    expect(getInstallAnchor()).toEqual(fixture);
  });
});
