import type { IStorage } from "./storage-types";
import { StorageFactory } from "./storage-factory";

/**
 * Storage Facade - Main interface for all storage operations
 * This provides a unified API regardless of the underlying storage implementation
 */
export class StorageFacade implements IStorage {
  private get storage(): IStorage {
    return StorageFactory.getInstance();
  }

  // Basic key-value operations
  get<T>(key: string): T | null {
    return this.storage.get<T>(key);
  }

  set<T>(key: string, value: T): void {
    this.storage.set(key, value);
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  contains(key: string): boolean {
    return this.storage.contains(key);
  }

  clear(): void {
    this.storage.clear();
  }

  // String operations
  getString(key: string): string | null {
    return this.storage.getString(key);
  }

  setString(key: string, value: string): void {
    this.storage.setString(key, value);
  }

  // Async operations (if supported)
  async getAsync<T>(key: string): Promise<T | null> {
    if (this.storage.getAsync) {
      return this.storage.getAsync<T>(key);
    }
    // Fallback to sync operation
    return Promise.resolve(this.storage.get<T>(key));
  }

  async setAsync<T>(key: string, value: T): Promise<void> {
    if (this.storage.setAsync) {
      return this.storage.setAsync(key, value);
    }
    // Fallback to sync operation
    this.storage.set(key, value);
    return Promise.resolve();
  }

  async deleteAsync(key: string): Promise<void> {
    if (this.storage.deleteAsync) {
      return this.storage.deleteAsync(key);
    }
    // Fallback to sync operation
    this.storage.delete(key);
    return Promise.resolve();
  }

  async clearAsync(): Promise<void> {
    if (this.storage.clearAsync) {
      return this.storage.clearAsync();
    }
    // Fallback to sync operation
    this.storage.clear();
    return Promise.resolve();
  }

  // Batch operations (if supported)
  getBatch<T>(keys: string[]): Record<string, T | null> {
    if (this.storage.getBatch) {
      return this.storage.getBatch<T>(keys);
    }
    // Fallback to individual operations
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.storage.get<T>(key);
    }
    return result;
  }

  setBatch<T>(data: Record<string, T>): void {
    if (this.storage.setBatch) {
      this.storage.setBatch(data);
    } else {
      // Fallback to individual operations
      for (const [key, value] of Object.entries(data)) {
        this.storage.set(key, value);
      }
    }
  }

  deleteBatch(keys: string[]): void {
    if (this.storage.deleteBatch) {
      this.storage.deleteBatch(keys);
    } else {
      // Fallback to individual operations
      for (const key of keys) {
        this.storage.delete(key);
      }
    }
  }

  // Metadata operations
  getAllKeys(): string[] {
    return this.storage.getAllKeys?.() || [];
  }

  size(): number {
    return this.storage.size?.() || 0;
  }

  // Utility methods
  exists(key: string): boolean {
    return this.contains(key);
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Get multiple values with type safety
   */
  getMultiple<T>(keys: string[]): (T | null)[] {
    return keys.map((key) => this.get<T>(key));
  }

  /**
   * Set multiple key-value pairs
   */
  setMultiple<T>(entries: Array<[string, T]>): void {
    const data: Record<string, T> = {};
    for (const [key, value] of entries) {
      data[key] = value;
    }
    this.setBatch(data);
  }

  /**
   * Update a value only if the key exists
   */
  update<T>(key: string, value: T): boolean {
    if (this.contains(key)) {
      this.set(key, value);
      return true;
    }
    return false;
  }

  /**
   * Get a value with a default fallback
   */
  getWithDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Set a value only if the key doesn't exist
   */
  setIfNotExists<T>(key: string, value: T): boolean {
    if (!this.contains(key)) {
      this.set(key, value);
      return true;
    }
    return false;
  }

  /**
   * Get storage information
   */
  getInfo() {
    const config = StorageFactory.getCurrentConfig();
    return {
      type: config?.type || "unknown",
      size: this.size(),
      supportsAsync: StorageFactory.supportsAsync(),
      supportsBatch: StorageFactory.supportsBatch(),
      keys: this.getAllKeys(),
    };
  }
}

// Export a singleton instance
export const storageFacade = new StorageFacade();
