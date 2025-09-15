import { StorageFactory } from "~/data/storage/storage-factory";
import { StorageError } from "~/data/storage/storage-types";
import { MMKVStorage } from "~/data/storage/implementations/mmkv-storage";

// Mock implementations
jest.mock("~/data/storage/implementations/mmkv-storage");
jest.mock("~/data/storage/implementations/async-storage-impl");
jest.mock("~/data/storage/implementations/sqlite-storage");
jest.mock("~/data/storage/implementations/watermelon-storage");
jest.mock("~/data/storage/implementations/realm-storage");

const MockMMKVStorage = MMKVStorage as jest.MockedClass<typeof MMKVStorage>;

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
      expect(instance).toBeInstanceOf(MMKVStorage);
    });

    it("should initialize with AsyncStorage", () => {
      const {
        AsyncStorageImpl,
      } = require("~/data/storage/implementations/async-storage-impl");
      const config = { type: "async-storage" as const };

      StorageFactory.initialize(config);

      expect(AsyncStorageImpl).toHaveBeenCalled();
    });

    it("should initialize with SQLite", () => {
      const {
        SQLiteStorage,
      } = require("~/data/storage/implementations/sqlite-storage");
      const config = {
        type: "sqlite" as const,
        options: { databaseName: "test.db" },
      };

      StorageFactory.initialize(config);

      expect(SQLiteStorage).toHaveBeenCalledWith({ databaseName: "test.db" });
    });

    it("should initialize with WatermelonDB", () => {
      const {
        WatermelonStorage,
      } = require("~/data/storage/implementations/watermelon-storage");
      const config = {
        type: "watermelon" as const,
        options: { databaseName: "watermelon" },
      };

      StorageFactory.initialize(config);

      expect(WatermelonStorage).toHaveBeenCalledWith({
        databaseName: "watermelon",
      });
    });

    it("should initialize with Realm", () => {
      const {
        RealmStorage,
      } = require("~/data/storage/implementations/realm-storage");
      const config = {
        type: "realm" as const,
        options: { schemaVersion: 1 },
      };

      StorageFactory.initialize(config);

      expect(RealmStorage).toHaveBeenCalledWith({ schemaVersion: 1 });
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
      expect(instance).toBeInstanceOf(MMKVStorage);
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
      MockMMKVStorage.mockImplementationOnce(() => mockInstance as any);

      StorageFactory.initialize({ type: "mmkv" });

      expect(StorageFactory.supportsAsync()).toBe(true);
    });

    it("should return false for storage without async methods", () => {
      const mockInstance = {};
      MockMMKVStorage.mockImplementationOnce(() => mockInstance as any);

      StorageFactory.initialize({ type: "mmkv" });

      expect(StorageFactory.supportsAsync()).toBe(false);
    });
  });

  describe("supportsBatch", () => {
    it("should return true for storage with batch methods", () => {
      const mockInstance = {
        getBatch: jest.fn(),
        setBatch: jest.fn(),
      };
      MockMMKVStorage.mockImplementationOnce(() => mockInstance as any);

      StorageFactory.initialize({ type: "mmkv" });

      expect(StorageFactory.supportsBatch()).toBe(true);
    });

    it("should return false for storage without batch methods", () => {
      const mockInstance = {};
      MockMMKVStorage.mockImplementationOnce(() => mockInstance as any);

      StorageFactory.initialize({ type: "mmkv" });

      expect(StorageFactory.supportsBatch()).toBe(false);
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
    it("should create MMKV storage with options", () => {
      const { createMMKVStorage } = require("~/data/storage/storage-factory");
      const options = { id: "custom", encryptionKey: "secret" };

      createMMKVStorage(options);

      expect(MockMMKVStorage).toHaveBeenCalledWith(options);
    });

    it("should create MMKV storage without options", () => {
      const { createMMKVStorage } = require("~/data/storage/storage-factory");

      createMMKVStorage();

      expect(MockMMKVStorage).toHaveBeenCalledWith(undefined);
    });

    it("should create AsyncStorage", () => {
      const { createAsyncStorage } = require("~/data/storage/storage-factory");
      const {
        AsyncStorageImpl,
      } = require("~/data/storage/implementations/async-storage-impl");

      createAsyncStorage();

      expect(AsyncStorageImpl).toHaveBeenCalled();
    });

    it("should create SQLite storage", () => {
      const { createSQLiteStorage } = require("~/data/storage/storage-factory");
      const {
        SQLiteStorage,
      } = require("~/data/storage/implementations/sqlite-storage");
      const options = { databaseName: "test.db" };

      createSQLiteStorage(options);

      expect(SQLiteStorage).toHaveBeenCalledWith(options);
    });

    it("should create WatermelonDB storage", () => {
      const {
        createWatermelonStorage,
      } = require("~/data/storage/storage-factory");
      const {
        WatermelonStorage,
      } = require("~/data/storage/implementations/watermelon-storage");
      const options = { databaseName: "watermelon" };

      createWatermelonStorage(options);

      expect(WatermelonStorage).toHaveBeenCalledWith(options);
    });

    it("should create Realm storage", () => {
      const { createRealmStorage } = require("~/data/storage/storage-factory");
      const {
        RealmStorage,
      } = require("~/data/storage/implementations/realm-storage");
      const options = { schemaVersion: 1 };

      createRealmStorage(options);

      expect(RealmStorage).toHaveBeenCalledWith(options);
    });
  });
});
