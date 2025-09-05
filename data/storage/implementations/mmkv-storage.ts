import { MMKV } from "react-native-mmkv";
import type { IStorage } from "../types";
import { StorageError, JSONSerializer } from "../types";

export class MMKVStorage implements IStorage {
  private storage: MMKV;
  private serializer = new JSONSerializer();

  constructor(options?: { id?: string; encryptionKey?: string }) {
    try {
      this.storage = new MMKV({
        id: options?.id || "default",
        encryptionKey: options?.encryptionKey,
      });
    } catch (error) {
      throw new StorageError(`Failed to initialize MMKV: ${error}`, "mmkv");
    }
  }

  get<T>(key: string): T | null {
    try {
      const value = this.storage.getString(key);
      return value ? (this.serializer.deserialize(value) as T) : null;
    } catch (error) {
      throw new StorageError(`Failed to get key "${key}": ${error}`, "mmkv");
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.storage.set(key, this.serializer.serialize(value));
    } catch (error) {
      throw new StorageError(`Failed to set key "${key}": ${error}`, "mmkv");
    }
  }

  getString(key: string): string | null {
    try {
      return this.storage.getString(key) || null;
    } catch (error) {
      throw new StorageError(
        `Failed to get string for key "${key}": ${error}`,
        "mmkv"
      );
    }
  }

  setString(key: string, value: string): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      throw new StorageError(
        `Failed to set string for key "${key}": ${error}`,
        "mmkv"
      );
    }
  }

  delete(key: string): void {
    try {
      this.storage.delete(key);
    } catch (error) {
      throw new StorageError(`Failed to delete key "${key}": ${error}`, "mmkv");
    }
  }

  contains(key: string): boolean {
    try {
      return this.storage.contains(key);
    } catch (error) {
      throw new StorageError(`Failed to check key "${key}": ${error}`, "mmkv");
    }
  }

  clear(): void {
    try {
      this.storage.clearAll();
    } catch (error) {
      throw new StorageError(`Failed to clear storage: ${error}`, "mmkv");
    }
  }

  getAllKeys(): string[] {
    try {
      return this.storage.getAllKeys();
    } catch (error) {
      throw new StorageError(`Failed to get all keys: ${error}`, "mmkv");
    }
  }

  size(): number {
    try {
      return this.getAllKeys().length;
    } catch (error) {
      throw new StorageError(`Failed to get storage size: ${error}`, "mmkv");
    }
  }

  getBatch<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  setBatch<T>(data: Record<string, T>): void {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  deleteBatch(keys: string[]): void {
    for (const key of keys) {
      this.delete(key);
    }
  }
}
