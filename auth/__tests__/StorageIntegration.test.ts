import { jest } from "@jest/globals";
import type { AuthSession } from "~/types/AuthTypes";

// Mock storage config and factory to avoid real encrypted storage usage
const inMemoryStore = new Map<string, string>();

const mockStorage = {
  set: jest.fn((key: string, value: string) => {
    inMemoryStore.set(key, value);
  }),
  get: jest.fn((key: string) => {
    return inMemoryStore.get(key) ?? null;
  }),
  delete: jest.fn((key: string) => {
    inMemoryStore.delete(key);
  }),
  contains: jest.fn((key: string) => {
    return inMemoryStore.has(key);
  }),
  getString: jest.fn((key: string) => {
    return inMemoryStore.get(key) ?? null;
  }),
  setString: jest.fn((key: string, value: string) => {
    inMemoryStore.set(key, value);
  }),
};

jest.mock("~/data/storage/storage-config", () => ({
  storageConfigs: {
    encrypted: {
      key: "test-encrypted-key",
    },
  },
}));

jest.mock("~/data/storage", () => ({
  StorageFactory: {
    initialize: jest.fn(() => mockStorage),
  },
}));

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { StorageFactory } from "~/data/storage";
import { AuthStorageManager } from "../StorageIntegration";

const getMockStorage = (): typeof mockStorage =>
  ((StorageFactory.initialize as any).mock.results[0]?.value ?? mockStorage) as typeof mockStorage;

describe("AuthStorageManager", () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it("stores session tokens, expiry, and JSON session data", async () => {
    const manager = AuthStorageManager.getInstance();
    const session: AuthSession = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      tokenType: "Bearer",
    };

    await manager.storeSession(session);

    const storage = getMockStorage();

    expect(storage.set).toHaveBeenCalledWith("auth_access_token", "access-token");
    expect(storage.set).toHaveBeenCalledWith("auth_refresh_token", "refresh-token");

    const storedSessionJson = storage.getString("auth_session_data");
    expect(storedSessionJson).not.toBeNull();
    expect(storedSessionJson).toContain("access-token");
    expect(storedSessionJson).toContain("refresh-token");
  });

  it("returns null when no stored session exists", async () => {
    const manager = AuthStorageManager.getInstance();

    const session = await manager.getSession();

    expect(session).toBeNull();
  });

  it("rehydrates expiresAt as a Date when restoring a stored session", async () => {
    const manager = AuthStorageManager.getInstance();
    const storage = getMockStorage();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    storage.set(
      "auth_session_data",
      JSON.stringify({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: expiresAt.toISOString(),
        tokenType: "Bearer",
      })
    );

    const session = await manager.getSession();

    expect(session).not.toBeNull();
    expect(session?.expiresAt).toBeInstanceOf(Date);
    expect(session?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
  });

  it("clears and returns null when stored session is expired", async () => {
    const manager = AuthStorageManager.getInstance();
    const storage = getMockStorage();

    const expiredSession: AuthSession = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      tokenType: "Bearer",
    };

    storage.set("auth_session_data", JSON.stringify(expiredSession));

    const result = await manager.getSession();

    expect(result).toBeNull();
    expect(storage.contains("auth_session_data")).toBe(false);
  });

  it("clearSession removes all auth keys", async () => {
    const manager = AuthStorageManager.getInstance();
    const storage = getMockStorage();

    // Seed some values
    storage.set("auth_access_token", "token");
    storage.set("auth_refresh_token", "refresh");
    storage.set("auth_session_data", "{}");
    storage.set("auth_session_expires_at", new Date().toISOString());

    await manager.clearSession();

    expect(storage.contains("auth_access_token")).toBe(false);
    expect(storage.contains("auth_refresh_token")).toBe(false);
    expect(storage.contains("auth_session_data")).toBe(false);
    expect(storage.contains("auth_session_expires_at")).toBe(false);
  });
});
