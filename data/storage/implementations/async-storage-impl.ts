import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  IAsyncBatchStorage,
  IAsyncStorage,
  IAsyncStorageMetadata,
  IStorage,
} from "../storage-types";
import { StorageError, JSONSerializer } from "../storage-types";

/**
 * AsyncStorage implementation following Interface Segregation Principle
 * Implements IStorage with unified API + async-specific interfaces
 */
export class AsyncStorageImpl
  implements IStorage, IAsyncStorage, IAsyncStorageMetadata, IAsyncBatchStorage
{
  private serializer = new JSONSerializer();

  // ===== UNIFIED IStorage API =====
  // These methods match the StorageFacade API with method overloading

  get<T>(key: string): T | null;
  get<T>(key: string, useAsync: false): T | null;
  get<T>(key: string, useAsync: true): Promise<T | null>;
  get<T>(key: string, useAsync?: boolean): T | null | Promise<T | null> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use get(key, true) instead."
      );
    }
    return this.getAsync<T>(key);
  }

  set<T>(key: string, value: T): void;
  set<T>(key: string, value: T, useAsync: false): void;
  set<T>(key: string, value: T, useAsync: true): Promise<void>;
  set<T>(key: string, value: T, useAsync?: boolean): void | Promise<void> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use set(key, value, true) instead."
      );
    }
    return this.setAsync(key, value);
  }

  delete(key: string): void;
  delete(key: string, useAsync: false): void;
  delete(key: string, useAsync: true): Promise<void>;
  delete(key: string, useAsync?: boolean): void | Promise<void> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use delete(key, true) instead."
      );
    }
    return this.deleteAsync(key);
  }

  contains(key: string): boolean;
  contains(key: string, useAsync: false): boolean;
  contains(key: string, useAsync: true): Promise<boolean>;
  contains(key: string, useAsync?: boolean): boolean | Promise<boolean> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use contains(key, true) instead."
      );
    }
    return this.getAsync<any>(key).then((value) => value !== null);
  }

  clear(): void;
  clear(useAsync: false): void;
  clear(useAsync: true): Promise<void>;
  clear(useAsync?: boolean): void | Promise<void> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use clear(true) instead."
      );
    }
    return this.clearAsync();
  }

  getString(key: string): string | null;
  getString(key: string, useAsync: false): string | null;
  getString(key: string, useAsync: true): Promise<string | null>;
  getString(
    key: string,
    useAsync?: boolean
  ): string | null | Promise<string | null> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use getString(key, true) instead."
      );
    }
    return this.getAsync<string>(key);
  }

  setString(key: string, value: string): void;
  setString(key: string, value: string, useAsync: false): void;
  setString(key: string, value: string, useAsync: true): Promise<void>;
  setString(
    key: string,
    value: string,
    useAsync?: boolean
  ): void | Promise<void> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use setString(key, value, true) instead."
      );
    }
    return this.setAsync(key, value);
  }

  getAllKeys(): string[];
  getAllKeys(useAsync: false): string[];
  getAllKeys(useAsync: true): Promise<string[]>;
  getAllKeys(useAsync?: boolean): string[] | Promise<string[]> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use getAllKeys(true) instead."
      );
    }
    return this.getAllKeysAsync();
  }

  size(): number;
  size(useAsync: false): number;
  size(useAsync: true): Promise<number>;
  size(useAsync?: boolean): number | Promise<number> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use size(true) instead."
      );
    }
    return this.sizeAsync();
  }

  getBatch<T>(keys: string[]): Record<string, T | null>;
  getBatch<T>(keys: string[], useAsync: false): Record<string, T | null>;
  getBatch<T>(
    keys: string[],
    useAsync: true
  ): Promise<Record<string, T | null>>;
  getBatch<T>(
    keys: string[],
    useAsync?: boolean
  ): Record<string, T | null> | Promise<Record<string, T | null>> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use getBatch(keys, true) instead."
      );
    }
    return this.getBatchAsync<T>(keys);
  }

  setBatch<T>(data: Record<string, T>): void;
  setBatch<T>(data: Record<string, T>, useAsync: false): void;
  setBatch<T>(data: Record<string, T>, useAsync: true): Promise<void>;
  setBatch<T>(
    data: Record<string, T>,
    useAsync?: boolean
  ): void | Promise<void> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use setBatch(data, true) instead."
      );
    }
    return this.setBatchAsync(data);
  }

  deleteBatch(keys: string[]): void;
  deleteBatch(keys: string[], useAsync: false): void;
  deleteBatch(keys: string[], useAsync: true): Promise<void>;
  deleteBatch(keys: string[], useAsync?: boolean): void | Promise<void> {
    if (useAsync === false) {
      throw new Error(
        "AsyncStorage does not support synchronous operations. Use deleteBatch(keys, true) instead."
      );
    }
    return this.deleteBatchAsync(keys);
  }

  getInfo() {
    return {
      type: "async-storage" as const,
      size: "Use size(true) for async storage",
      supportsAsync: true,
      supportsBatch: true,
      keys: "Use getAllKeys(true) for async storage",
      isAsync: true,
    };
  }

  // ===== ASYNC-SPECIFIC INTERFACES =====
  // Core async operations
  async getAsync<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? (this.serializer.deserialize(value) as T) : null;
    } catch (error) {
      throw new StorageError(
        `Failed to get key "${key}": ${error}`,
        "async-storage"
      );
    }
  }

  async setAsync<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, this.serializer.serialize(value));
    } catch (error) {
      throw new StorageError(
        `Failed to set key "${key}": ${error}`,
        "async-storage"
      );
    }
  }

  async deleteAsync(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new StorageError(
        `Failed to delete key "${key}": ${error}`,
        "async-storage"
      );
    }
  }

  async clearAsync(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw new StorageError(
        `Failed to clear storage: ${error}`,
        "async-storage"
      );
    }
  }

  // Async metadata operations
  async getAllKeysAsync(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly to mutable array
    } catch (error) {
      throw new StorageError(
        `Failed to get all keys: ${error}`,
        "async-storage"
      );
    }
  }

  async sizeAsync(): Promise<number> {
    try {
      const keys = await this.getAllKeysAsync();
      return keys.length;
    } catch (error) {
      throw new StorageError(
        `Failed to get storage size: ${error}`,
        "async-storage"
      );
    }
  }

  // Async batch operations
  async getBatchAsync<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, T | null> = {};

      keyValuePairs.forEach(([key, value]: [string, string | null]) => {
        result[key] = value ? (this.serializer.deserialize(value) as T) : null;
      });

      return result;
    } catch (error) {
      throw new StorageError(`Failed to get batch: ${error}`, "async-storage");
    }
  }

  async setBatchAsync<T>(data: Record<string, T>): Promise<void> {
    try {
      const keyValuePairs: [string, string][] = Object.entries(data).map(
        ([key, value]) => [key, this.serializer.serialize(value)]
      );
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      throw new StorageError(`Failed to set batch: ${error}`, "async-storage");
    }
  }

  async deleteBatchAsync(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      throw new StorageError(
        `Failed to delete batch: ${error}`,
        "async-storage"
      );
    }
  }
}
