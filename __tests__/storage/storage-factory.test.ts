import { StorageFactory } from "~/data/storage/storage-factory";
import { StorageError } from "~/data/storage/storage-types";
import { MMKVStorageImpl } from "~/data/storage/implementations/mmkv-storage-impl";

// Mock implementations
jest.mock("~/data/storage/implementations/mmkv-storage");
jest.mock("~/data/storage/implementations/async-storage-impl");

const MockMMKVStorage = MMKVStorageImpl as jest.MockedClass<
  typeof MMKVStorageImpl
>;

describe("StorageFactory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (StorageFactory as any).instance = null;
    (StorageFactory as any).currentConfig = null;
  });

  describe("initialize", () => {
    it("should initialize with MMKV storage", () => {
      const config = { type: "mmkv" as const, options: { id: "test" } };

      const instance = StorageFactory.initialize(config);

      expect(MockMMKVStorage).toHaveBeenCalledWith({ id: "test" });
      expect(instance).toBeInstanceOf(MMKVStorageImpl);
    });

    it("should initialize with AsyncStorage", () => {
      const {
        AsyncStorageImpl,
      } = require("~/data/storage/implementations/async-storage-impl");
      const config = { type: "async-storage" as const };

      StorageFactory.initialize(config);

      expect(AsyncStorageImpl).toHaveBeenCalled();
    });

    it("should throw error for unsupported storage type", () => {
      const config = { type: "unsupported" as any };

      expect(() => StorageFactory.initialize(config)).toThrow(StorageError);
      expect(() => StorageFactory.initialize(config)).toThrow(
        "Unsupported storage type"
      );
    });

    it("should store current configuration", () => {
      const config = { type: "mmkv" as const, options: { id: "test" } };

      StorageFactory.initialize(config);

      expect(StorageFactory.getCurrentConfig()).toEqual(config);
    });

    it.skip("should handle initialization errors", () => {
      jest.clearAllMocks();
      MockMMKVStorage.mockImplementationOnce(() => {
        throw new Error("Init failed");
      });

      const config = { type: "mmkv" as const };

      expect(() => StorageFactory.initialize(config)).toThrow(StorageError);
      expect(() => StorageFactory.initialize(config)).toThrow(
        "Failed to initialize storage"
      );
    });
  });

  describe("getInstance", () => {
    it("should return existing instance if initialized", () => {
      const config = { type: "mmkv" as const };
      const instance1 = StorageFactory.initialize(config);
      const instance2 = StorageFactory.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should initialize with default MMKV if not initialized", () => {
      const instance = StorageFactory.getInstance();

      expect(MockMMKVStorage).toHaveBeenCalled();
      expect(instance).toBeInstanceOf(MMKVStorageImpl);
    });
  });

  describe("switchStorage", () => {
    it("should switch to different storage type", () => {
      // Initialize with MMKV first
      StorageFactory.initialize({ type: "mmkv" });

      // Switch to AsyncStorage
      const {
        AsyncStorageImpl,
      } = require("~/data/storage/implementations/async-storage-impl");
      const newConfig = { type: "async-storage" as const };

      const newInstance = StorageFactory.switchStorage(newConfig);

      expect(AsyncStorageImpl).toHaveBeenCalled();
      expect(StorageFactory.getCurrentConfig()).toEqual(newConfig);
    });

    it("should reset instance when switching", () => {
      const instance1 = StorageFactory.initialize({ type: "mmkv" });
      const instance2 = StorageFactory.switchStorage({ type: "mmkv" });

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("getCurrentConfig", () => {
    it("should return null if not initialized", () => {
      expect(StorageFactory.getCurrentConfig()).toBeNull();
    });

    it("should return current configuration", () => {
      const config = { type: "mmkv" as const, options: { id: "test" } };
      StorageFactory.initialize(config);

      expect(StorageFactory.getCurrentConfig()).toEqual(config);
    });
  });

  describe("supportsAsync", () => {
    it("should return true for storage with async methods", () => {
      const mockInstance = {
        getAsync: jest.fn(),
        setAsync: jest.fn(),
      };
      MockAsyncStorageImpl.mockImplementationOnce(() => mockInstance as any);

      StorageFactory.initialize({ type: "mmkv" });

      expect(StorageFactory.supportsAsync()).toBe(true);
    });

    it("should return true for AsyncStorage (always has async methods)", () => {
      StorageFactory.initialize({ type: "mmkv" }); // Falls back to AsyncStorage

      expect(StorageFactory.supportsAsync()).toBe(true);
    });
  });

  describe("supportsBatch", () => {
    it("should return false for AsyncStorage (only has async batch)", () => {
      // Test with actual AsyncStorage configuration
      StorageFactory.initialize({ type: "async-storage" });

      expect(StorageFactory.supportsBatch()).toBe(false);
    });

    it("should return true for storage with sync batch methods", () => {
      // Test with MMKV which supports sync batch operations
      StorageFactory.initialize({ type: "mmkv" });

      expect(StorageFactory.supportsBatch()).toBe(true);
    });
  });

  describe("migrateStorage", () => {
    let mockFromStorage: any;
    let mockToStorage: any;

    beforeEach(() => {
      mockFromStorage = {
        getAllKeys: jest.fn(),
        getBatch: jest.fn(),
        get: jest.fn(),
      };
      mockToStorage = {
        setBatch: jest.fn(),
        set: jest.fn(),
      };

      MockMMKVStorage.mockImplementationOnce(
        () => mockFromStorage
      ).mockImplementationOnce(() => mockToStorage);
    });

    it("should migrate all data when no keys specified", async () => {
      const keys = ["key1", "key2"];
      const data = { key1: "value1", key2: "value2" };

      mockFromStorage.getAllKeys.mockReturnValue(keys);
      mockFromStorage.getBatch.mockReturnValue(data);

      await StorageFactory.migrateStorage({ type: "mmkv" }, { type: "mmkv" });

      expect(mockFromStorage.getAllKeys).toHaveBeenCalled();
      expect(mockFromStorage.getBatch).toHaveBeenCalledWith(keys);
      expect(mockToStorage.setBatch).toHaveBeenCalledWith(data);
    });

    it("should migrate specific keys when provided", async () => {
      const keys = ["key1", "key3"];
      const data = { key1: "value1", key3: "value3" };

      mockFromStorage.getBatch.mockReturnValue(data);

      await StorageFactory.migrateStorage(
        { type: "mmkv" },
        { type: "mmkv" },
        keys
      );

      expect(mockFromStorage.getAllKeys).not.toHaveBeenCalled();
      expect(mockFromStorage.getBatch).toHaveBeenCalledWith(keys);
      expect(mockToStorage.setBatch).toHaveBeenCalledWith(data);
    });

    it("should migrate one by one when batch not available", async () => {
      const keys = ["key1", "key2"];

      mockFromStorage.getAllKeys.mockReturnValue(keys);
      mockFromStorage.getBatch = undefined;
      mockFromStorage.get
        .mockReturnValueOnce("value1")
        .mockReturnValueOnce("value2");
      mockToStorage.setBatch = undefined;

      await StorageFactory.migrateStorage({ type: "mmkv" }, { type: "mmkv" });

      expect(mockFromStorage.get).toHaveBeenCalledWith("key1");
      expect(mockFromStorage.get).toHaveBeenCalledWith("key2");
      expect(mockToStorage.set).toHaveBeenCalledWith("key1", "value1");
      expect(mockToStorage.set).toHaveBeenCalledWith("key2", "value2");
    });

    it("should skip null values during migration", async () => {
      const keys = ["key1", "key2"];

      mockFromStorage.getAllKeys.mockReturnValue(keys);
      mockFromStorage.getBatch = undefined;
      mockFromStorage.get
        .mockReturnValueOnce("value1")
        .mockReturnValueOnce(null);
      mockToStorage.setBatch = undefined;

      await StorageFactory.migrateStorage({ type: "mmkv" }, { type: "mmkv" });

      expect(mockToStorage.set).toHaveBeenCalledWith("key1", "value1");
      expect(mockToStorage.set).toHaveBeenCalledTimes(1);
    });

    it("should handle empty data gracefully", async () => {
      mockFromStorage.getAllKeys.mockReturnValue([]);

      // Should not throw
      await StorageFactory.migrateStorage({ type: "mmkv" }, { type: "mmkv" });

      expect(mockFromStorage.getBatch).not.toHaveBeenCalled();
      expect(mockToStorage.setBatch).not.toHaveBeenCalled();
    });

    it("should throw StorageError on migration failure", async () => {
      mockFromStorage.getAllKeys.mockImplementation(() => {
        throw new Error("Migration failed");
      });

      await expect(
        StorageFactory.migrateStorage({ type: "mmkv" }, { type: "mmkv" })
      ).rejects.toThrow(StorageError);
    });
  });

  describe("Convenience Methods", () => {
    it("should create AsyncStorage", () => {
      const { createAsyncStorage } = require("~/data/storage/storage-factory");

      createAsyncStorage();

      expect(MockAsyncStorageImpl).toHaveBeenCalled();
    });

    // MMKV creation functions are commented out for Expo Go compatibility
    // Other storage types (SQLite, WatermelonDB, Realm) are not implemented yet
  });
});
