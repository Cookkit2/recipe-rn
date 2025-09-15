import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IStorage } from "../storage-types";
import { StorageError, JSONSerializer } from "../storage-types";

export class AsyncStorageImpl implements IStorage {
  private serializer = new JSONSerializer();

  // Sync methods (wrapper around async methods)
  get<T>(key: string): T | null {
    throw new Error(
      "AsyncStorage requires async operations. Use getAsync instead."
    );
  }

  set<T>(key: string, value: T): void {
    throw new Error(
      "AsyncStorage requires async operations. Use setAsync instead."
    );
  }

  getString(key: string): string | null {
    throw new Error(
      "AsyncStorage requires async operations. Use getAsync instead."
    );
  }

  setString(key: string, value: string): void {
    throw new Error(
      "AsyncStorage requires async operations. Use setAsync instead."
    );
  }

  delete(key: string): void {
    throw new Error(
      "AsyncStorage requires async operations. Use deleteAsync instead."
    );
  }

  contains(key: string): boolean {
    throw new Error(
      "AsyncStorage requires async operations. Use getAsync to check existence."
    );
  }

  clear(): void {
    throw new Error(
      "AsyncStorage requires async operations. Use clearAsync instead."
    );
  }

  // Async methods
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

  async getAllKeysAsync(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly array to mutable
    } catch (error) {
      throw new StorageError(
        `Failed to get all keys: ${error}`,
        "async-storage"
      );
    }
  }

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
