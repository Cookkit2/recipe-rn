import { MMKV } from "react-native-mmkv";
import type { IStorage } from "../storage-types";
import { StorageError, JSONSerializer } from "../storage-types";

export class MMKVStorageImpl implements IStorage {
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

  // ===== CORE OPERATIONS WITH UNIFIED API =====

  get<T>(key: string): T | null;
  get<T>(key: string, useAsync: false): T | null;
  get<T>(key: string, useAsync: true): Promise<T | null>;
  get<T>(key: string, useAsync?: boolean): T | null | Promise<T | null> {
    if (useAsync === true) {
      return Promise.resolve(this._getSyncImpl<T>(key));
    }
    return this._getSyncImpl<T>(key);
  }

  private _getSyncImpl<T>(key: string): T | null {
    try {
      const value = this.storage.getString(key);
      return value ? (this.serializer.deserialize(value) as T) : null;
    } catch (error) {
      throw new StorageError(`Failed to get key "${key}": ${error}`, "mmkv");
    }
  }

  set<T>(key: string, value: T): void;
  set<T>(key: string, value: T, useAsync: false): void;
  set<T>(key: string, value: T, useAsync: true): Promise<void>;
  set<T>(key: string, value: T, useAsync?: boolean): void | Promise<void> {
    if (useAsync === true) {
      return Promise.resolve(this._setSyncImpl(key, value));
    }
    this._setSyncImpl(key, value);
  }

  private _setSyncImpl<T>(key: string, value: T): void {
    try {
      this.storage.set(key, this.serializer.serialize(value));
    } catch (error) {
      throw new StorageError(`Failed to set key "${key}": ${error}`, "mmkv");
    }
  }

  delete(key: string): void;
  delete(key: string, useAsync: false): void;
  delete(key: string, useAsync: true): Promise<void>;
  delete(key: string, useAsync?: boolean): void | Promise<void> {
    if (useAsync === true) {
      return Promise.resolve(this._deleteSyncImpl(key));
    }
    this._deleteSyncImpl(key);
  }

  private _deleteSyncImpl(key: string): void {
    try {
      this.storage.delete(key);
    } catch (error) {
      throw new StorageError(`Failed to delete key "${key}": ${error}`, "mmkv");
    }
  }

  clear(): void;
  clear(useAsync: false): void;
  clear(useAsync: true): Promise<void>;
  clear(useAsync?: boolean): void | Promise<void> {
    if (useAsync === true) {
      return Promise.resolve(this._clearSyncImpl());
    }
    this._clearSyncImpl();
  }

  private _clearSyncImpl(): void {
    try {
      this.storage.clearAll();
    } catch (error) {
      throw new StorageError(`Failed to clear storage: ${error}`, "mmkv");
    }
  }

  // ===== STRING OPERATIONS =====

  getString(key: string): string | null;
  getString(key: string, useAsync: false): string | null;
  getString(key: string, useAsync: true): Promise<string | null>;
  getString(key: string, useAsync?: boolean): string | null | Promise<string | null> {
    if (useAsync === true) {
      return Promise.resolve(this._getStringSyncImpl(key));
    }
    return this._getStringSyncImpl(key);
  }

  private _getStringSyncImpl(key: string): string | null {
    try {
      return this.storage.getString(key) || null;
    } catch (error) {
      throw new StorageError(
        `Failed to get string for key "${key}": ${error}`,
        "mmkv"
      );
    }
  }

  setString(key: string, value: string): void;
  setString(key: string, value: string, useAsync: false): void;
  setString(key: string, value: string, useAsync: true): Promise<void>;
  setString(key: string, value: string, useAsync?: boolean): void | Promise<void> {
    if (useAsync === true) {
      return Promise.resolve(this._setStringSyncImpl(key, value));
    }
    this._setStringSyncImpl(key, value);
  }

  private _setStringSyncImpl(key: string, value: string): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      throw new StorageError(
        `Failed to set string for key "${key}": ${error}`,
        "mmkv"
      );
    }
  }

  // ===== METADATA OPERATIONS =====

  contains(key: string): boolean;
  contains(key: string, useAsync: false): boolean;
  contains(key: string, useAsync: true): Promise<boolean>;
  contains(key: string, useAsync?: boolean): boolean | Promise<boolean> {
    if (useAsync === true) {
      return Promise.resolve(this._containsSyncImpl(key));
    }
    return this._containsSyncImpl(key);
  }

  private _containsSyncImpl(key: string): boolean {
    try {
      return this.storage.contains(key);
    } catch (error) {
      throw new StorageError(
        `Failed to check if key "${key}" exists: ${error}`,
        "mmkv"
      );
    }
  }

  getAllKeys(): string[];
  getAllKeys(useAsync: false): string[];
  getAllKeys(useAsync: true): Promise<string[]>;
  getAllKeys(useAsync?: boolean): string[] | Promise<string[]> {
    if (useAsync === true) {
      return Promise.resolve(this._getAllKeysSyncImpl());
    }
    return this._getAllKeysSyncImpl();
  }

  private _getAllKeysSyncImpl(): string[] {
    try {
      return this.storage.getAllKeys();
    } catch (error) {
      throw new StorageError(`Failed to get all keys: ${error}`, "mmkv");
    }
  }

  size(): number;
  size(useAsync: false): number;
  size(useAsync: true): Promise<number>;
  size(useAsync?: boolean): number | Promise<number> {
    if (useAsync === true) {
      return Promise.resolve(this._sizeSyncImpl());
    }
    return this._sizeSyncImpl();
  }

  private _sizeSyncImpl(): number {
    try {
      return this.storage.getAllKeys().length;
    } catch (error) {
      throw new StorageError(`Failed to get storage size: ${error}`, "mmkv");
    }
  }

  // ===== BATCH OPERATIONS =====

  getBatch<T>(keys: string[]): Record<string, T | null>;
  getBatch<T>(keys: string[], useAsync: false): Record<string, T | null>;
  getBatch<T>(keys: string[], useAsync: true): Promise<Record<string, T | null>>;
  getBatch<T>(keys: string[], useAsync?: boolean): Record<string, T | null> | Promise<Record<string, T | null>> {
    if (useAsync === true) {
      return Promise.resolve(this._getBatchSyncImpl<T>(keys));
    }
    return this._getBatchSyncImpl<T>(keys);
  }

  private _getBatchSyncImpl<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this._getSyncImpl<T>(key);
    }
    return result;
  }

  setBatch<T>(data: Record<string, T>): void;
  setBatch<T>(data: Record<string, T>, useAsync: false): void;
  setBatch<T>(data: Record<string, T>, useAsync: true): Promise<void>;
  setBatch<T>(data: Record<string, T>, useAsync?: boolean): void | Promise<void> {
    if (useAsync === true) {
      return Promise.resolve(this._setBatchSyncImpl(data));
    }
    this._setBatchSyncImpl(data);
  }

  private _setBatchSyncImpl<T>(data: Record<string, T>): void {
    for (const [key, value] of Object.entries(data)) {
      this._setSyncImpl(key, value);
    }
  }

  deleteBatch(keys: string[]): void;
  deleteBatch(keys: string[], useAsync: false): void;
  deleteBatch(keys: string[], useAsync: true): Promise<void>;
  deleteBatch(keys: string[], useAsync?: boolean): void | Promise<void> {
    if (useAsync === true) {
      return Promise.resolve(this._deleteBatchSyncImpl(keys));
    }
    this._deleteBatchSyncImpl(keys);
  }

  private _deleteBatchSyncImpl(keys: string[]): void {
    for (const key of keys) {
      this._deleteSyncImpl(key);
    }
  }

  // ===== STORAGE INFO =====

  getInfo(): {
    type: string;
    size: string | number;
    supportsAsync: boolean;
    supportsBatch: boolean;
    keys: string | string[];
    isAsync: boolean;
  } {
    return {
      type: "mmkv",
      size: this._sizeSyncImpl(),
      supportsAsync: true, // MMKV can provide async wrapper
      supportsBatch: true,
      keys: this._getAllKeysSyncImpl(),
      isAsync: false, // MMKV is primarily synchronous
    };
  }
}
