import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { log } from "~/utils/logger";

describe("storage encryption config", () => {
  const originalBtoa = globalThis.btoa;
  let warn: jest.SpiedFunction<typeof log.warn>;

  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(log, "warn").mockImplementation(() => undefined);
    jest.mocked(SecureStore.getItem).mockReturnValue(null);
    jest
      .mocked(Crypto.getRandomBytes)
      .mockReturnValue(new Uint8Array(Array.from({ length: 32 }, (_, i) => i)));
    delete (globalThis as Record<string, unknown>).btoa;
  });

  afterEach(() => {
    warn.mockRestore();
    if (originalBtoa) {
      globalThis.btoa = originalBtoa;
    } else {
      delete (globalThis as Record<string, unknown>).btoa;
    }
  });

  it("generates an RN-safe encryption key without relying on browser btoa", () => {
    const { storageConfigs } = require("../storage-config") as typeof import("../storage-config");

    let encryptedConfig: import("..").StorageConfig | undefined;
    expect(() => {
      encryptedConfig = storageConfigs.encrypted!;
    }).not.toThrow();

    const encryptionKey = encryptedConfig?.options?.encryptionKey;
    expect(encryptionKey).toBe("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    expect(SecureStore.setItem).toHaveBeenCalledWith("mmkv_encryption_key", encryptionKey);
    expect(warn).not.toHaveBeenCalled();
  });

  it("still warns when a stored key is long but not a generated hex key", () => {
    jest.mocked(SecureStore.getItem).mockReturnValue("a".repeat(32));
    const { storageConfigs } = require("../storage-config") as typeof import("../storage-config");

    void storageConfigs.encrypted;

    expect(warn).toHaveBeenCalledWith(
      "[storage-config] Encryption key should contain at least 3 of: uppercase, lowercase, numbers, special characters for optimal security."
    );
  });
});
