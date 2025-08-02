import { MMKVStorage } from "~/data/storage/implementations/mmkv-storage";
import { StorageError } from "~/data/storage/types";

// Mock MMKV
const mockMMKV = {
  set: jest.fn(),
  getString: jest.fn(),
  delete: jest.fn(),
  contains: jest.fn(),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn().mockImplementation(() => mockMMKV),
}));

describe("MMKVStorage", () => {
  let storage: MMKVStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations to default behavior
    mockMMKV.set.mockImplementation(() => {});
    mockMMKV.getString.mockImplementation(() => undefined);
    mockMMKV.delete.mockImplementation(() => {});
    mockMMKV.contains.mockImplementation(() => false);
    mockMMKV.clearAll.mockImplementation(() => {});
    mockMMKV.getAllKeys.mockImplementation(() => []);

    storage = new MMKVStorage();
  });

  describe("Initialization", () => {
    it("should initialize with default options", () => {
      const { MMKV } = require("react-native-mmkv");
      expect(MMKV).toHaveBeenCalledWith({
        id: "default",
        encryptionKey: undefined,
      });
    });

    it("should initialize with custom options", () => {
      const { MMKV } = require("react-native-mmkv");
      jest.clearAllMocks();

      new MMKVStorage({ id: "custom", encryptionKey: "secret" });

      expect(MMKV).toHaveBeenCalledWith({
        id: "custom",
        encryptionKey: "secret",
      });
    });

    it.skip("should throw StorageError on initialization failure", () => {
      const { MMKV } = require("react-native-mmkv");

      // Clear the existing mock and set up error
      jest.clearAllMocks();
      MMKV.mockImplementationOnce(() => {
        throw new Error("MMKV init failed");
      });

      expect(() => new MMKVStorage()).toThrow(StorageError);
      expect(() => new MMKVStorage()).toThrow("Failed to initialize MMKV");
    });
  });

  describe("Basic Operations", () => {
    describe("get/set", () => {
      it("should set and get a value", () => {
        const testData = { name: "John", age: 30 };
        mockMMKV.getString.mockReturnValue(JSON.stringify(testData));

        storage.set("user", testData);
        const result = storage.get<typeof testData>("user");

        expect(mockMMKV.set).toHaveBeenCalledWith(
          "user",
          JSON.stringify(testData)
        );
        expect(mockMMKV.getString).toHaveBeenCalledWith("user");
        expect(result).toEqual(testData);
      });

      it("should return null for non-existent key", () => {
        mockMMKV.getString.mockReturnValue(undefined);

        const result = storage.get("nonexistent");

        expect(result).toBeNull();
      });

      it("should handle null/undefined values", () => {
        mockMMKV.getString.mockReturnValue("null");
        storage.set("nullValue", null);

        expect(mockMMKV.set).toHaveBeenCalledWith("nullValue", "null");
      });

      it("should throw StorageError on get failure", () => {
        mockMMKV.getString.mockImplementation(() => {
          throw new Error("Get failed");
        });

        expect(() => storage.get("key")).toThrow(StorageError);
        expect(() => storage.get("key")).toThrow('Failed to get key "key"');
      });

      it("should throw StorageError on set failure", () => {
        mockMMKV.set.mockImplementation(() => {
          throw new Error("Set failed");
        });

        expect(() => storage.set("key", "value")).toThrow(StorageError);
        expect(() => storage.set("key", "value")).toThrow(
          'Failed to set key "key"'
        );
      });
    });

    describe("getString/setString", () => {
      it("should set and get string values", () => {
        mockMMKV.getString.mockReturnValue("test string");

        storage.setString("key", "test string");
        const result = storage.getString("key");

        expect(mockMMKV.set).toHaveBeenCalledWith("key", "test string");
        expect(result).toBe("test string");
      });

      it("should return null for non-existent string", () => {
        mockMMKV.getString.mockReturnValue(undefined);

        const result = storage.getString("nonexistent");

        expect(result).toBeNull();
      });

      it("should throw StorageError on getString failure", () => {
        mockMMKV.getString.mockImplementation(() => {
          throw new Error("GetString failed");
        });

        expect(() => storage.getString("key")).toThrow(StorageError);
      });

      it("should throw StorageError on setString failure", () => {
        mockMMKV.set.mockImplementation(() => {
          throw new Error("SetString failed");
        });

        expect(() => storage.setString("key", "value")).toThrow(StorageError);
      });
    });

    describe("delete", () => {
      it("should delete a key", () => {
        storage.delete("key");

        expect(mockMMKV.delete).toHaveBeenCalledWith("key");
      });

      it("should throw StorageError on delete failure", () => {
        mockMMKV.delete.mockImplementation(() => {
          throw new Error("Delete failed");
        });

        expect(() => storage.delete("key")).toThrow(StorageError);
        expect(() => storage.delete("key")).toThrow(
          'Failed to delete key "key"'
        );
      });
    });

    describe("contains", () => {
      it("should check if key exists", () => {
        mockMMKV.contains.mockReturnValue(true);

        const result = storage.contains("key");

        expect(mockMMKV.contains).toHaveBeenCalledWith("key");
        expect(result).toBe(true);
      });

      it("should return false for non-existent key", () => {
        mockMMKV.contains.mockReturnValue(false);

        const result = storage.contains("nonexistent");

        expect(result).toBe(false);
      });

      it("should throw StorageError on contains failure", () => {
        mockMMKV.contains.mockImplementation(() => {
          throw new Error("Contains failed");
        });

        expect(() => storage.contains("key")).toThrow(StorageError);
      });
    });

    describe("clear", () => {
      it("should clear all data", () => {
        storage.clear();

        expect(mockMMKV.clearAll).toHaveBeenCalled();
      });

      it("should throw StorageError on clear failure", () => {
        mockMMKV.clearAll.mockImplementation(() => {
          throw new Error("Clear failed");
        });

        expect(() => storage.clear()).toThrow(StorageError);
        expect(() => storage.clear()).toThrow("Failed to clear storage");
      });
    });
  });

  describe("Metadata Operations", () => {
    describe("getAllKeys", () => {
      it("should return all keys", () => {
        const keys = ["key1", "key2", "key3"];
        mockMMKV.getAllKeys.mockReturnValue(keys);

        const result = storage.getAllKeys();

        expect(mockMMKV.getAllKeys).toHaveBeenCalled();
        expect(result).toEqual(keys);
      });

      it("should throw StorageError on getAllKeys failure", () => {
        mockMMKV.getAllKeys.mockImplementation(() => {
          throw new Error("GetAllKeys failed");
        });

        expect(() => storage.getAllKeys()).toThrow(StorageError);
      });
    });

    describe("size", () => {
      it("should return storage size", () => {
        mockMMKV.getAllKeys.mockReturnValue(["key1", "key2"]);

        const result = storage.size();

        expect(result).toBe(2);
      });

      it("should return 0 for empty storage", () => {
        mockMMKV.getAllKeys.mockReturnValue([]);

        const result = storage.size();

        expect(result).toBe(0);
      });

      it("should throw StorageError on size failure", () => {
        mockMMKV.getAllKeys.mockImplementation(() => {
          throw new Error("Size failed");
        });

        expect(() => storage.size()).toThrow(StorageError);
      });
    });
  });

  describe("Batch Operations", () => {
    describe("getBatch", () => {
      it("should get multiple values", () => {
        const data = {
          key1: { value: "data1" },
          key2: { value: "data2" },
        };

        mockMMKV.getString
          .mockReturnValueOnce(JSON.stringify(data.key1))
          .mockReturnValueOnce(JSON.stringify(data.key2))
          .mockReturnValueOnce(undefined);

        const result = storage.getBatch(["key1", "key2", "key3"]);

        expect(result).toEqual({
          key1: data.key1,
          key2: data.key2,
          key3: null,
        });
      });

      it("should handle empty keys array", () => {
        const result = storage.getBatch([]);

        expect(result).toEqual({});
        expect(mockMMKV.getString).not.toHaveBeenCalled();
      });
    });

    describe("setBatch", () => {
      it("should set multiple values", () => {
        const data = {
          key1: { value: "data1" },
          key2: { value: "data2" },
        };

        storage.setBatch(data);

        expect(mockMMKV.set).toHaveBeenCalledTimes(2);
        expect(mockMMKV.set).toHaveBeenCalledWith(
          "key1",
          JSON.stringify(data.key1)
        );
        expect(mockMMKV.set).toHaveBeenCalledWith(
          "key2",
          JSON.stringify(data.key2)
        );
      });

      it("should handle empty data object", () => {
        storage.setBatch({});

        expect(mockMMKV.set).not.toHaveBeenCalled();
      });
    });

    describe("deleteBatch", () => {
      it("should delete multiple keys", () => {
        storage.deleteBatch(["key1", "key2", "key3"]);

        expect(mockMMKV.delete).toHaveBeenCalledTimes(3);
        expect(mockMMKV.delete).toHaveBeenCalledWith("key1");
        expect(mockMMKV.delete).toHaveBeenCalledWith("key2");
        expect(mockMMKV.delete).toHaveBeenCalledWith("key3");
      });

      it("should handle empty keys array", () => {
        storage.deleteBatch([]);

        expect(mockMMKV.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe("Complex Data Types", () => {
    it("should handle objects", () => {
      const data = {
        user: { name: "John", age: 30 },
        settings: { theme: "dark" },
      };

      mockMMKV.getString.mockReturnValue(JSON.stringify(data));

      storage.set("complex", data);
      const result = storage.get("complex");

      expect(result).toEqual(data);
    });

    it("should handle arrays", () => {
      const data = [1, 2, 3, { name: "test" }];

      mockMMKV.getString.mockReturnValue(JSON.stringify(data));

      storage.set("array", data);
      const result = storage.get("array");

      expect(result).toEqual(data);
    });

    it("should handle nested objects", () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };

      mockMMKV.getString.mockReturnValue(JSON.stringify(data));

      storage.set("nested", data);
      const result = storage.get("nested");

      expect(result).toEqual(data);
    });

    it("should handle dates (as strings)", () => {
      const date = new Date();
      const data = { createdAt: date };

      mockMMKV.getString.mockReturnValue(JSON.stringify(data));

      storage.set("withDate", data);
      const result = storage.get<typeof data>("withDate");

      // Dates are serialized as strings
      expect(result?.createdAt).toBe(date.toISOString());
    });
  });

  describe("Error Handling", () => {
    it("should handle JSON parse errors gracefully", () => {
      mockMMKV.getString.mockReturnValue("invalid json");

      expect(() => storage.get("key")).toThrow(StorageError);
    });

    it("should handle JSON stringify errors", () => {
      const circularRef: any = {};
      circularRef.self = circularRef;

      expect(() => storage.set("circular", circularRef)).toThrow(StorageError);
    });

    it("should provide meaningful error messages", () => {
      mockMMKV.set.mockImplementation(() => {
        throw new Error("Disk full");
      });

      try {
        storage.set("key", "value");
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).storageType).toBe("mmkv");
        expect((error as StorageError).message).toContain("Failed to set key");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string keys", () => {
      storage.set("", "value");

      expect(mockMMKV.set).toHaveBeenCalledWith("", '"value"');
    });

    it("should handle special characters in keys", () => {
      const specialKey = "key with spaces & symbols!@#$%^&*()";
      storage.set(specialKey, "value");

      expect(mockMMKV.set).toHaveBeenCalledWith(specialKey, '"value"');
    });

    it("should handle unicode characters", () => {
      const unicodeData = { message: "Hello 世界 🌍" };
      mockMMKV.getString.mockReturnValue(JSON.stringify(unicodeData));

      storage.set("unicode", unicodeData);
      const result = storage.get("unicode");

      expect(result).toEqual(unicodeData);
    });

    it("should handle very large data", () => {
      const largeData = {
        data: "x".repeat(10000),
        array: new Array(1000).fill({ test: "data" }),
      };

      storage.set("large", largeData);

      expect(mockMMKV.set).toHaveBeenCalledWith(
        "large",
        JSON.stringify(largeData)
      );
    });

    it("should handle boolean values", () => {
      mockMMKV.getString.mockReturnValue("true");

      storage.set("bool", true);
      const result = storage.get("bool");

      expect(result).toBe(true);
    });

    it("should handle number values", () => {
      mockMMKV.getString.mockReturnValue("42");

      storage.set("number", 42);
      const result = storage.get("number");

      expect(result).toBe(42);
    });
  });
});
