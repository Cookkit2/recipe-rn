jest.mock("../implementations/mmkv-storage-impl", () => ({ MMKVStorageImpl: jest.fn() }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function freshStorage() {
  jest.resetModules();
  const { MMKVStorageImpl } = require("../implementations/mmkv-storage-impl");
  const values = new Map<string, unknown>();
  const implementation = {
    get: jest.fn((key: string) => values.get(key) ?? null),
    set: jest.fn((key: string, value: unknown) => values.set(key, value)),
  };
  MMKVStorageImpl.mockImplementation(() => implementation);
  const { StorageFactory } = require("../storage-factory") as typeof import("../storage-factory");
  const { storageFacade } = require("../storage-facade") as typeof import("../storage-facade");
  return { StorageFactory, storageFacade, implementation, MMKVStorageImpl };
}

it("allows the first preference read and write without a separate bootstrap call", () => {
  const { storageFacade, MMKVStorageImpl } = freshStorage();
  expect(MMKVStorageImpl).not.toHaveBeenCalled();
  expect(storageFacade.get("theme")).toBeNull();
  storageFacade.set("theme", "dark");
  expect(storageFacade.get("theme")).toBe("dark");
  expect(MMKVStorageImpl).toHaveBeenCalledTimes(1);
  expect(MMKVStorageImpl).toHaveBeenCalledWith(undefined);
});

it("reuses an explicitly configured storage without replacing its options", () => {
  const { StorageFactory, MMKVStorageImpl, implementation } = freshStorage();
  const config = { type: "mmkv" as const, options: { id: "custom", encryptionKey: "test-key" } };
  StorageFactory.initialize(config);
  expect(StorageFactory.getInstance()).toBe(implementation);
  expect(StorageFactory.getCurrentConfig()).toEqual(config);
  expect(MMKVStorageImpl).toHaveBeenCalledTimes(1);
  expect(MMKVStorageImpl).toHaveBeenCalledWith(config.options);
});

it("surfaces a native initialization failure and permits a later retry", () => {
  const { StorageFactory, MMKVStorageImpl, implementation } = freshStorage();
  MMKVStorageImpl.mockImplementationOnce(() => {
    throw new Error("native storage unavailable");
  });
  expect(() => StorageFactory.getInstance()).toThrow("native storage unavailable");
  expect(StorageFactory.getCurrentConfig()).toBeNull();
  expect(StorageFactory.getInstance()).toBe(implementation);
  expect(MMKVStorageImpl).toHaveBeenCalledTimes(2);
});
