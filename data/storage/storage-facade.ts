import type { IStorage } from "./storage-types";
import { StorageFactory } from "./storage-factory";

/**
 * Storage Facade - Intelligent unified API for all storage operations
 * Automatically detects storage capabilities and provides appropriate defaults
 */
export class StorageFacade implements IStorage {
  private get storage(): IStorage {
    return StorageFactory.getInstance();
  }

  /**
   * Check if the underlying storage is primarily async-based
   */
  private isAsyncStorage(): boolean {
    return StorageFactory.getCurrentConfig()?.type === "async-storage";
  }

  /**
   * Check if the underlying storage supports a specific method
   */
  private supportsMethod(methodName: string): boolean {
    return typeof (this.storage as any)[methodName] === 'function';
  }

  /**
   * Internal async getter - handles method detection and fallbacks
   */
  private async _getAsync<T>(key: string): Promise<T | null> {
    if (this.supportsMethod('getAsync')) {
      const asyncStorage = this.storage as any;
      return asyncStorage.getAsync(key) as Promise<T | null>;
    }
    // Fallback to sync operation
    return Promise.resolve(this.storage.get<T>(key));
  }

  /**
   * Internal async setter - handles method detection and fallbacks
   */
  private async _setAsync<T>(key: string, value: T): Promise<void> {
    if (this.supportsMethod('setAsync')) {
      return (this.storage as any).setAsync(key, value);
    }
    // Fallback to sync operation
    this.storage.set(key, value);
    return Promise.resolve();
  }

  /**
   * Internal async deleter - handles method detection and fallbacks
   */
  private async _deleteAsync(key: string): Promise<void> {
    if (this.supportsMethod('deleteAsync')) {
      return (this.storage as any).deleteAsync(key);
    }
    // Fallback to sync operation
    this.storage.delete(key);
    return Promise.resolve();
  }

  /**
   * Internal async clear - handles method detection and fallbacks
   */
  private async _clearAsync(): Promise<void> {
    if (this.supportsMethod('clearAsync')) {
      return (this.storage as any).clearAsync();
    }
    // Fallback to sync operation
    this.storage.clear();
    return Promise.resolve();
  }

  // ===== CORE OPERATIONS WITH UNIFIED API =====

  /**
   * Get a value from storage
   * @param key Storage key
   * @param useAsync Force async operation (defaults to storage capability)
   */
  get<T>(key: string): T | null;
  get<T>(key: string, useAsync: false): T | null;
  get<T>(key: string, useAsync: true): Promise<T | null>;
  get<T>(key: string, useAsync?: boolean): T | null | Promise<T | null> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAsync<T>(key);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use get(key, true) instead."
      );
    }
    
    return this.storage.get<T>(key);
  }

  /**
   * Set a value in storage
   * @param key Storage key
   * @param value Value to store
   * @param useAsync Force async operation (defaults to storage capability)
   */
  set<T>(key: string, value: T): void;
  set<T>(key: string, value: T, useAsync: false): void;
  set<T>(key: string, value: T, useAsync: true): Promise<void>;
  set<T>(key: string, value: T, useAsync?: boolean): void | Promise<void> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._setAsync(key, value);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use set(key, value, true) instead."
      );
    }

    this.storage.set(key, value);
  }

  /**
   * Delete a key from storage
   * @param key Storage key
   * @param useAsync Force async operation (defaults to storage capability)
   */
  delete(key: string): void;
  delete(key: string, useAsync: false): void;
  delete(key: string, useAsync: true): Promise<void>;
  delete(key: string, useAsync?: boolean): void | Promise<void> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._deleteAsync(key);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use delete(key, true) instead."
      );
    }

    this.storage.delete(key);
  }

  /**
   * Check if a key exists in storage
   * @param key Storage key
   * @param useAsync Force async operation (defaults to storage capability)
   */
  contains(key: string): boolean;
  contains(key: string, useAsync: false): boolean;
  contains(key: string, useAsync: true): Promise<boolean>;
  contains(key: string, useAsync?: boolean): boolean | Promise<boolean> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAsync<any>(key).then(value => value !== null);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use contains(key, true) instead."
      );
    }

    return this.storage.contains(key);
  }

  /**
   * Clear all storage
   * @param useAsync Force async operation (defaults to storage capability)
   */
  clear(): void;
  clear(useAsync: false): void;
  clear(useAsync: true): Promise<void>;
  clear(useAsync?: boolean): void | Promise<void> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._clearAsync();
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use clear(true) instead."
      );
    }

    this.storage.clear();
  }

  /**
   * Get a string value from storage
   * @param key Storage key
   * @param useAsync Force async operation (defaults to storage capability)
   */
  getString(key: string): string | null;
  getString(key: string, useAsync: false): string | null;
  getString(key: string, useAsync: true): Promise<string | null>;
  getString(key: string, useAsync?: boolean): string | null | Promise<string | null> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAsync<string>(key);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use getString(key, true) instead."
      );
    }

    return this.storage.getString(key);
  }

  /**
   * Set a string value in storage
   * @param key Storage key
   * @param value String value to store
   * @param useAsync Force async operation (defaults to storage capability)
   */
  setString(key: string, value: string): void;
  setString(key: string, value: string, useAsync: false): void;
  setString(key: string, value: string, useAsync: true): Promise<void>;
  setString(key: string, value: string, useAsync?: boolean): void | Promise<void> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._setAsync(key, value);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use setString(key, value, true) instead."
      );
    }

    this.storage.setString(key, value);
  }

  // ===== BATCH OPERATIONS =====

  /**
   * Get multiple values from storage
   * @param keys Array of storage keys
   * @param useAsync Force async operation (defaults to storage capability)
   */
  getBatch<T>(keys: string[]): Record<string, T | null>;
  getBatch<T>(keys: string[], useAsync: false): Record<string, T | null>;
  getBatch<T>(keys: string[], useAsync: true): Promise<Record<string, T | null>>;
  getBatch<T>(keys: string[], useAsync?: boolean): Record<string, T | null> | Promise<Record<string, T | null>> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getBatchAsync<T>(keys);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use getBatch(keys, true) instead."
      );
    }

    if (this.supportsMethod('getBatch')) {
      const asyncStorage = this.storage as any;
      return asyncStorage.getBatch(keys) as Record<string, T | null>;
    }
    
    // Fallback to individual operations
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.storage.get<T>(key);
    }
    return result;
  }

  /**
   * Set multiple values in storage
   * @param data Object with key-value pairs to store
   * @param useAsync Force async operation (defaults to storage capability)
   */
  setBatch<T>(data: Record<string, T>): void;
  setBatch<T>(data: Record<string, T>, useAsync: false): void;
  setBatch<T>(data: Record<string, T>, useAsync: true): Promise<void>;
  setBatch<T>(data: Record<string, T>, useAsync?: boolean): void | Promise<void> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._setBatchAsync(data);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use setBatch(data, true) instead."
      );
    }

    if (this.supportsMethod('setBatch')) {
      (this.storage as any).setBatch(data);
    } else {
      // Fallback to individual operations
      for (const [key, value] of Object.entries(data)) {
        this.storage.set(key, value);
      }
    }
  }

  /**
   * Delete multiple keys from storage
   * @param keys Array of storage keys to delete
   * @param useAsync Force async operation (defaults to storage capability)
   */
  deleteBatch(keys: string[]): void;
  deleteBatch(keys: string[], useAsync: false): void;
  deleteBatch(keys: string[], useAsync: true): Promise<void>;
  deleteBatch(keys: string[], useAsync?: boolean): void | Promise<void> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._deleteBatchAsync(keys);
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use deleteBatch(keys, true) instead."
      );
    }

    if (this.supportsMethod('deleteBatch')) {
      (this.storage as any).deleteBatch(keys);
    } else {
      // Fallback to individual operations
      for (const key of keys) {
        this.storage.delete(key);
      }
    }
  }

  // ===== METADATA OPERATIONS =====

  /**
   * Get all storage keys
   * @param useAsync Force async operation (defaults to storage capability)
   */
  getAllKeys(): string[];
  getAllKeys(useAsync: false): string[];
  getAllKeys(useAsync: true): Promise<string[]>;
  getAllKeys(useAsync?: boolean): string[] | Promise<string[]> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAllKeysAsync();
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use getAllKeys(true) instead."
      );
    }

    return (this.storage as any).getAllKeys?.() || [];
  }

  /**
   * Get storage size (number of keys)
   * @param useAsync Force async operation (defaults to storage capability)
   */
  size(): number;
  size(useAsync: false): number;
  size(useAsync: true): Promise<number>;
  size(useAsync?: boolean): number | Promise<number> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._sizeAsync();
    }

    if (this.isAsyncStorage()) {
      throw new Error(
        "AsyncStorage requires async operations. Use size(true) instead."
      );
    }

    return (this.storage as any).size?.() || 0;
  }

  // ===== INTERNAL ASYNC BATCH/METADATA HELPERS =====

  private async _getBatchAsync<T>(keys: string[]): Promise<Record<string, T | null>> {
    if (this.supportsMethod('getBatchAsync')) {
      const asyncStorage = this.storage as any;
      return asyncStorage.getBatchAsync(keys) as Promise<Record<string, T | null>>;
    }
    
    // Fallback - use async operations if available
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this._getAsync<T>(key);
    }
    return result;
  }

  private async _setBatchAsync<T>(data: Record<string, T>): Promise<void> {
    if (this.supportsMethod('setBatchAsync')) {
      return (this.storage as any).setBatchAsync(data);
    }
    
    // Fallback - use async operations if available
    for (const [key, value] of Object.entries(data)) {
      await this._setAsync(key, value);
    }
  }

  private async _deleteBatchAsync(keys: string[]): Promise<void> {
    if (this.supportsMethod('deleteBatchAsync')) {
      return (this.storage as any).deleteBatchAsync(keys);
    }
    
    // Fallback - use async operations if available
    for (const key of keys) {
      await this._deleteAsync(key);
    }
  }

  private async _getAllKeysAsync(): Promise<string[]> {
    if (this.supportsMethod('getAllKeysAsync')) {
      return (this.storage as any).getAllKeysAsync();
    }
    // Fallback to sync operation
    return Promise.resolve((this.storage as any).getAllKeys?.() || []);
  }

  private async _sizeAsync(): Promise<number> {
    if (this.supportsMethod('sizeAsync')) {
      return (this.storage as any).sizeAsync();
    }
    // Fallback - calculate from keys
    const keys = await this._getAllKeysAsync();
    return keys.length;
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if a key exists (alias for contains)
   */
  exists(key: string): boolean;
  exists(key: string, useAsync: false): boolean;
  exists(key: string, useAsync: true): Promise<boolean>;
  exists(key: string, useAsync?: boolean): boolean | Promise<boolean> {
    return this.contains(key, useAsync as any);
  }

  /**
   * Check if storage is empty
   */
  isEmpty(): boolean;
  isEmpty(useAsync: false): boolean;
  isEmpty(useAsync: true): Promise<boolean>;
  isEmpty(useAsync?: boolean): boolean | Promise<boolean> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._sizeAsync().then(size => size === 0);
    }

    return this.size(false) === 0;
  }

  /**
   * Get multiple values with type safety
   */
  getMultiple<T>(keys: string[]): (T | null)[];
  getMultiple<T>(keys: string[], useAsync: false): (T | null)[];
  getMultiple<T>(keys: string[], useAsync: true): Promise<(T | null)[]>;
  getMultiple<T>(keys: string[], useAsync?: boolean): (T | null)[] | Promise<(T | null)[]> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return Promise.all(keys.map(key => this._getAsync<T>(key)));
    }

    return keys.map(key => this.get<T>(key, false));
  }

  /**
   * Set multiple key-value pairs
   */
  setMultiple<T>(entries: Array<[string, T]>): void;
  setMultiple<T>(entries: Array<[string, T]>, useAsync: false): void;
  setMultiple<T>(entries: Array<[string, T]>, useAsync: true): Promise<void>;
  setMultiple<T>(entries: Array<[string, T]>, useAsync?: boolean): void | Promise<void> {
    const data: Record<string, T> = {};
    for (const [key, value] of entries) {
      data[key] = value;
    }
    return this.setBatch(data, useAsync as any);
  }

  /**
   * Update a value only if the key exists
   */
  update<T>(key: string, value: T): boolean;
  update<T>(key: string, value: T, useAsync: false): boolean;
  update<T>(key: string, value: T, useAsync: true): Promise<boolean>;
  update<T>(key: string, value: T, useAsync?: boolean): boolean | Promise<boolean> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAsync<T>(key).then(existing => {
        if (existing !== null) {
          return this._setAsync(key, value).then(() => true);
        }
        return false;
      });
    }

    if (this.contains(key, false)) {
      this.set(key, value, false);
      return true;
    }
    return false;
  }

  /**
   * Get a value with a default fallback
   */
  getWithDefault<T>(key: string, defaultValue: T): T;
  getWithDefault<T>(key: string, defaultValue: T, useAsync: false): T;
  getWithDefault<T>(key: string, defaultValue: T, useAsync: true): Promise<T>;
  getWithDefault<T>(key: string, defaultValue: T, useAsync?: boolean): T | Promise<T> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAsync<T>(key).then(value => value !== null ? value : defaultValue);
    }

    const value = this.get<T>(key, false);
    return value !== null ? value : defaultValue;
  }

  /**
   * Set a value only if the key doesn't exist
   */
  setIfNotExists<T>(key: string, value: T): boolean;
  setIfNotExists<T>(key: string, value: T, useAsync: false): boolean;
  setIfNotExists<T>(key: string, value: T, useAsync: true): Promise<boolean>;
  setIfNotExists<T>(key: string, value: T, useAsync?: boolean): boolean | Promise<boolean> {
    const shouldUseAsync = useAsync ?? this.isAsyncStorage();

    if (shouldUseAsync) {
      return this._getAsync<T>(key).then(existing => {
        if (existing === null) {
          return this._setAsync(key, value).then(() => true);
        }
        return false;
      });
    }

    if (!this.contains(key, false)) {
      this.set(key, value, false);
      return true;
    }
    return false;
  }

  /**
   * Get storage information
   */
  getInfo() {
    const config = StorageFactory.getCurrentConfig();
    const isAsync = this.isAsyncStorage();
    
    return {
      type: config?.type || "unknown",
      isAsync,
      size: isAsync ? "Use size(true) for async storage" : this.size(false),
      supportsAsync: StorageFactory.supportsAsync(),
      supportsBatch: StorageFactory.supportsBatch(),
      keys: isAsync ? "Use getAllKeys(true) for async storage" : this.getAllKeys(false),
    };
  }
}

// Export a singleton instance
export const storageFacade = new StorageFacade();
