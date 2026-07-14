import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

describe("storage encryption config", () => {
  const originalBtoa = globalThis.btoa;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(SecureStore.getItem).mockReturnValue(null);
    jest
      .mocked(Crypto.getRandomBytes)
      .mockReturnValue(new Uint8Array(Array.from({ length: 32 }, (_, i) => i)));
    delete (globalThis as Record<string, unknown>).btoa;
  });

  afterEach(() => {
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
  });
});
