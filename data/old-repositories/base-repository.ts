import { storageFacade } from "../storage";
import type { IStorage } from "../storage";

/**
 * Base repository class that provides common storage operations
 * All specific repositories can extend this for consistent behavior
 */
export abstract class BaseRepository<T> {
  protected storage: IStorage;
  protected key: string;

  constructor(key: string, storage: IStorage = storageFacade) {
    this.storage = storage;
    this.key = key;
  }

  /**
   * Get all items
   */
  getAll(): T[] {
    const items = this.storage.getString(this.key);
    return items ? JSON.parse(items) : [];
  }

  /**
   * Set all items (replaces existing data)
   */
  setAll(items: T[]): void {
    this.storage.setString(this.key, JSON.stringify(items));
  }

  /**
   * Add a single item
   */
  add(item: T): void {
    const items = this.getAll();
    items.push(item);
    this.setAll(items);
  }

  /**
   * Add multiple items
   */
  addMany(newItems: T[]): void {
    const items = this.getAll();
    items.push(...newItems);
    this.setAll(items);
  }

  /**
   * Update an item based on a predicate
   */
  updateWhere(
    predicate: (item: T) => boolean,
    updater: (item: T) => T
  ): boolean {
    const items = this.getAll();
    let updated = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && predicate(item)) {
        items[i] = updater(item);
        updated = true;
      }
    }

    if (updated) {
      this.setAll(items);
    }

    return updated;
  }

  /**
   * Delete items based on a predicate
   */
  deleteWhere(predicate: (item: T) => boolean): number {
    const items = this.getAll();
    const originalLength = items.length;
    const filteredItems = items.filter((item) => !predicate(item));

    if (filteredItems.length !== originalLength) {
      this.setAll(filteredItems);
      return originalLength - filteredItems.length;
    }

    return 0;
  }

  /**
   * Find items based on a predicate
   */
  findWhere(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Find the first item that matches a predicate
   */
  findFirst(predicate: (item: T) => boolean): T | null {
    return this.getAll().find(predicate) || null;
  }

  /**
   * Check if any item matches a predicate
   */
  exists(predicate: (item: T) => boolean): boolean {
    return this.getAll().some(predicate);
  }

  /**
   * Count items
   */
  count(): number {
    return this.getAll().length;
  }

  /**
   * Count items that match a predicate
   */
  countWhere(predicate: (item: T) => boolean): number {
    return this.getAll().filter(predicate).length;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.storage.delete(this.key);
  }

  /**
   * Check if storage contains any data
   */
  isEmpty(): boolean {
    return !this.storage.contains(this.key) || this.getAll().length === 0;
  }

  /**
   * Initialize with default data if empty
   */
  initializeIfEmpty(defaultData: T[]): void {
    if (this.isEmpty()) {
      this.setAll(defaultData);
    }
  }

  /**
   * Backup current data to a different key
   */
  backup(backupKey?: string): void {
    const data = this.getAll();
    const key = backupKey || `${this.key}_backup_${Date.now()}`;
    this.storage.setString(key, JSON.stringify(data));
  }

  /**
   * Restore data from a backup key
   */
  restore(backupKey: string): void {
    const backupData = this.storage.getString(backupKey);
    if (backupData) {
      this.storage.setString(this.key, backupData);
    }
  }

  /**
   * Get storage information
   */
  getInfo() {
    return {
      key: this.key,
      count: this.count(),
      isEmpty: this.isEmpty(),
      storageInfo:
        this.storage instanceof Object && "getInfo" in this.storage
          ? (this.storage as any).getInfo()
          : null,
    };
  }
}
