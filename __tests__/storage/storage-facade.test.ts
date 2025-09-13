import { StorageFacade } from "~/data/storage/storage-facade";
import { StorageFactory } from "~/data/storage/storage-factory";
import { type IStorage } from "~/data/storage/storage-types";

// Create a complete mock storage object
const createMockStorage = () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  contains: jest.fn(),
  clear: jest.fn(),
  getString: jest.fn(),
  setString: jest.fn(),
  getAsync: jest.fn(),
  setAsync: jest.fn(),
  deleteAsync: jest.fn(),
  clearAsync: jest.fn(),
  getBatch: jest.fn(),
  setBatch: jest.fn(),
  deleteBatch: jest.fn(),
  getAllKeys: jest.fn(),
  size: jest.fn(),
});

let mockStorage: jest.Mocked<IStorage>;

jest.mock("~/data/storage/storage-factory", () => ({
  StorageFactory: {
    getInstance: jest.fn(() => mockStorage),
    getCurrentConfig: jest.fn(),
    supportsAsync: jest.fn(),
    supportsBatch: jest.fn(),
  },
}));

describe("StorageFacade", () => {
  let facade: StorageFacade;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorage() as jest.Mocked<IStorage>;
    (StorageFactory.getInstance as jest.Mock).mockReturnValue(mockStorage);
    facade = new StorageFacade();
  });

  describe("Basic Operations", () => {
    it("should delegate get to underlying storage", () => {
      const expectedValue = { test: "data" };
      mockStorage.get.mockReturnValue(expectedValue);

      const result = facade.get("key");

      expect(mockStorage.get).toHaveBeenCalledWith("key");
      expect(result).toBe(expectedValue);
    });

    it("should delegate set to underlying storage", () => {
      const value = { test: "data" };

      facade.set("key", value);

      expect(mockStorage.set).toHaveBeenCalledWith("key", value);
    });

    it("should delegate delete to underlying storage", () => {
      facade.delete("key");

      expect(mockStorage.delete).toHaveBeenCalledWith("key");
    });

    it("should delegate contains to underlying storage", () => {
      mockStorage.contains.mockReturnValue(true);

      const result = facade.contains("key");

      expect(mockStorage.contains).toHaveBeenCalledWith("key");
      expect(result).toBe(true);
    });

    it("should delegate clear to underlying storage", () => {
      facade.clear();

      expect(mockStorage.clear).toHaveBeenCalled();
    });
  });

  describe("String Operations", () => {
    it("should delegate getString to underlying storage", () => {
      mockStorage.getString.mockReturnValue("test string");

      const result = facade.getString("key");

      expect(mockStorage.getString).toHaveBeenCalledWith("key");
      expect(result).toBe("test string");
    });

    it("should delegate setString to underlying storage", () => {
      facade.setString("key", "test string");

      expect(mockStorage.setString).toHaveBeenCalledWith("key", "test string");
    });
  });

  describe("Unified API with useAsync", () => {
    it("should use async methods when useAsync=true and available", async () => {
      const expectedValue = { test: "async data" };
      mockStorage.getAsync = jest.fn().mockResolvedValue(expectedValue);

      const result = await facade.get("key", true);

      expect(mockStorage.getAsync).toHaveBeenCalledWith("key");
      expect(result).toBe(expectedValue);
    });

    it("should fallback to sync methods when useAsync=true but async not available", async () => {
      mockStorage.getAsync = undefined;
      const expectedValue = { test: "sync data" };
      mockStorage.get.mockReturnValue(expectedValue);

      const result = await facade.get("key", true);

      expect(mockStorage.get).toHaveBeenCalledWith("key");
      expect(result).toBe(expectedValue);
    });

    it("should use sync methods when useAsync=false", () => {
      const expectedValue = { test: "sync data" };
      mockStorage.get.mockReturnValue(expectedValue);

      const result = facade.get("key", false);

      expect(mockStorage.get).toHaveBeenCalledWith("key");
      expect(result).toBe(expectedValue);
    });

    it("should use async set when useAsync=true and available", async () => {
      const value = { test: "async data" };
      mockStorage.setAsync = jest.fn().mockResolvedValue(undefined);

      await facade.set("key", value, true);

      expect(mockStorage.setAsync).toHaveBeenCalledWith("key", value);
    });

    it("should fallback to sync set when useAsync=true but setAsync not available", async () => {
      mockStorage.setAsync = undefined;
      const value = { test: "sync data" };

      await facade.set("key", value, true);

      expect(mockStorage.set).toHaveBeenCalledWith("key", value);
    });

    it("should use async delete when useAsync=true and available", async () => {
      mockStorage.deleteAsync = jest.fn().mockResolvedValue(undefined);

      await facade.delete("key", true);

      expect(mockStorage.deleteAsync).toHaveBeenCalledWith("key");
    });

    it("should fallback to sync delete when useAsync=true but deleteAsync not available", async () => {
      mockStorage.deleteAsync = undefined;

      await facade.delete("key", true);

      expect(mockStorage.delete).toHaveBeenCalledWith("key");
    });

    it("should use async clear when useAsync=true and available", async () => {
      mockStorage.clearAsync = jest.fn().mockResolvedValue(undefined);

      await facade.clear(true);

      expect(mockStorage.clearAsync).toHaveBeenCalledWith();
    });

    it("should fallback to sync clear when useAsync=true but clearAsync not available", async () => {
      mockStorage.clearAsync = undefined;

      await facade.clear(true);

      expect(mockStorage.clear).toHaveBeenCalledWith();
    });
  });

  describe("Batch Operations", () => {
    it("should use batch getBatch when available", () => {
      const expectedData = {
        key1: { data: "test1" },
        key2: { data: "test2" },
        key3: null,
      };
      mockStorage.getBatch!.mockReturnValue(expectedData);

      const result = facade.getBatch(["key1", "key2", "key3"]);

      expect(mockStorage.getBatch).toHaveBeenCalledWith([
        "key1",
        "key2",
        "key3",
      ]);
      expect(result).toBe(expectedData);
    });

    it("should fallback to individual gets when getBatch not available", () => {
      mockStorage.getBatch = undefined;
      mockStorage.get
        .mockReturnValueOnce({ data: "test1" })
        .mockReturnValueOnce({ data: "test2" })
        .mockReturnValueOnce(null);

      const result = facade.getBatch(["key1", "key2", "key3"]);

      expect(mockStorage.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        key1: { data: "test1" },
        key2: { data: "test2" },
        key3: null,
      });
    });

    it("should use batch setBatch when available", () => {
      const data = {
        key1: { data: "test1" },
        key2: { data: "test2" },
      };

      facade.setBatch(data);

      expect(mockStorage.setBatch).toHaveBeenCalledWith(data);
    });

    it("should fallback to individual sets when setBatch not available", () => {
      mockStorage.setBatch = undefined;
      const data = {
        key1: { data: "test1" },
        key2: { data: "test2" },
      };

      facade.setBatch(data);

      expect(mockStorage.set).toHaveBeenCalledTimes(2);
      expect(mockStorage.set).toHaveBeenCalledWith("key1", { data: "test1" });
      expect(mockStorage.set).toHaveBeenCalledWith("key2", { data: "test2" });
    });

    it("should use batch deleteBatch when available", () => {
      const keys = ["key1", "key2", "key3"];

      facade.deleteBatch(keys);

      expect(mockStorage.deleteBatch).toHaveBeenCalledWith(keys);
    });

    it("should fallback to individual deletes when deleteBatch not available", () => {
      mockStorage.deleteBatch = undefined;
      const keys = ["key1", "key2", "key3"];

      facade.deleteBatch(keys);

      expect(mockStorage.delete).toHaveBeenCalledTimes(3);
      expect(mockStorage.delete).toHaveBeenCalledWith("key1");
      expect(mockStorage.delete).toHaveBeenCalledWith("key2");
      expect(mockStorage.delete).toHaveBeenCalledWith("key3");
    });
  });

  describe("Metadata Operations", () => {
    it("should delegate getAllKeys to underlying storage", () => {
      const expectedKeys = ["key1", "key2", "key3"];
      mockStorage.getAllKeys!.mockReturnValue(expectedKeys);

      const result = facade.getAllKeys();

      expect(mockStorage.getAllKeys).toHaveBeenCalled();
      expect(result).toBe(expectedKeys);
    });

    it("should return empty array when getAllKeys not available", () => {
      mockStorage.getAllKeys = undefined;

      const result = facade.getAllKeys();

      expect(result).toEqual([]);
    });

    it("should delegate size to underlying storage", () => {
      mockStorage.size!.mockReturnValue(5);

      const result = facade.size();

      expect(mockStorage.size).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it("should return 0 when size not available", () => {
      mockStorage.size = undefined;

      const result = facade.size();

      expect(result).toBe(0);
    });
  });

  describe("Utility Methods", () => {
    it("should check if key exists with exists method", () => {
      mockStorage.contains.mockReturnValue(true);

      const result = facade.exists("key");

      expect(mockStorage.contains).toHaveBeenCalledWith("key");
      expect(result).toBe(true);
    });

    it("should check if storage is empty", () => {
      mockStorage.size!.mockReturnValue(0);

      const result = facade.isEmpty();

      expect(result).toBe(true);
    });

    it("should return false for isEmpty when storage has items", () => {
      mockStorage.size!.mockReturnValue(5);

      const result = facade.isEmpty();

      expect(result).toBe(false);
    });

    it("should get multiple values with type safety", () => {
      mockStorage.get
        .mockReturnValueOnce({ data: "test1" })
        .mockReturnValueOnce({ data: "test2" })
        .mockReturnValueOnce(null);

      const result = facade.getMultiple(["key1", "key2", "key3"]);

      expect(result).toEqual([{ data: "test1" }, { data: "test2" }, null]);
    });

    it("should set multiple key-value pairs", () => {
      const entries: Array<[string, any]> = [
        ["key1", { data: "test1" }],
        ["key2", { data: "test2" }],
      ];

      facade.setMultiple(entries);

      expect(mockStorage.setBatch).toHaveBeenCalledWith({
        key1: { data: "test1" },
        key2: { data: "test2" },
      });
    });

    it("should update value only if key exists", () => {
      mockStorage.contains.mockReturnValue(true);

      const result = facade.update("existing-key", { updated: true });

      expect(mockStorage.contains).toHaveBeenCalledWith("existing-key");
      expect(mockStorage.set).toHaveBeenCalledWith("existing-key", {
        updated: true,
      });
      expect(result).toBe(true);
    });

    it("should not update value if key does not exist", () => {
      mockStorage.contains.mockReturnValue(false);

      const result = facade.update("non-existing-key", { updated: true });

      expect(mockStorage.contains).toHaveBeenCalledWith("non-existing-key");
      expect(mockStorage.set).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should get value with default fallback", () => {
      mockStorage.get.mockReturnValue(null);

      const result = facade.getWithDefault("missing-key", { default: "value" });

      expect(mockStorage.get).toHaveBeenCalledWith("missing-key");
      expect(result).toEqual({ default: "value" });
    });

    it("should return actual value when it exists", () => {
      const actualValue = { actual: "data" };
      mockStorage.get.mockReturnValue(actualValue);

      const result = facade.getWithDefault("existing-key", {
        default: "value",
      });

      expect(result).toBe(actualValue);
    });

    it("should set value only if key does not exist", () => {
      mockStorage.contains.mockReturnValue(false);

      const result = facade.setIfNotExists("new-key", { created: true });

      expect(mockStorage.contains).toHaveBeenCalledWith("new-key");
      expect(mockStorage.set).toHaveBeenCalledWith("new-key", {
        created: true,
      });
      expect(result).toBe(true);
    });

    it("should not set value if key already exists", () => {
      mockStorage.contains.mockReturnValue(true);

      const result = facade.setIfNotExists("existing-key", { created: true });

      expect(mockStorage.contains).toHaveBeenCalledWith("existing-key");
      expect(mockStorage.set).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("getInfo", () => {
    it("should return storage information", () => {
      const mockConfig = { type: "mmkv" as const };
      const mockSupportsAsync = true;
      const mockSupportsBatch = true;

      (StorageFactory.getCurrentConfig as jest.Mock).mockReturnValue(
        mockConfig
      );
      (StorageFactory.supportsAsync as jest.Mock).mockReturnValue(
        mockSupportsAsync
      );
      (StorageFactory.supportsBatch as jest.Mock).mockReturnValue(
        mockSupportsBatch
      );

      mockStorage.size!.mockReturnValue(10);
      mockStorage.getAllKeys!.mockReturnValue(["key1", "key2"]);

      const result = facade.getInfo();

      expect(result).toEqual({
        type: "mmkv",
        size: 10,
        supportsAsync: true,
        supportsBatch: true,
        keys: ["key1", "key2"],
        isAsync: false,
      });
    });

    it("should handle unknown storage type", () => {
      (StorageFactory.getCurrentConfig as jest.Mock).mockReturnValue(null);
      mockStorage.size!.mockReturnValue(0);
      mockStorage.getAllKeys!.mockReturnValue([]);

      const result = facade.getInfo();

      expect(result.type).toBe("unknown");
    });
  });

  describe("Error Propagation", () => {
    it("should propagate errors from underlying storage", () => {
      const error = new Error("Storage error");
      mockStorage.get.mockImplementation(() => {
        throw error;
      });

      expect(() => facade.get("key")).toThrow("Storage error");
    });

    it("should propagate async errors", async () => {
      const error = new Error("Async storage error");
      mockStorage.getAsync = jest.fn().mockRejectedValue(error);

      await expect(facade.get("key", true)).rejects.toThrow(
        "Async storage error"
      );
    });
  });
});
