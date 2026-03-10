import type { IStorage, StorageConfig, StorageType } from './storage-types';
import { StorageError } from './storage-types';
import { MMKVStorageImpl } from './implementations/mmkv-storage-impl';
import { log } from '~/utils/logger';

export class StorageFactory {
  private static instance: IStorage | null = null;
  private static currentConfig: StorageConfig | null = null;

  /**
   * Initialize the storage system with a specific configuration
   */
  static initialize(config: StorageConfig): IStorage {
    try {
      this.instance = this.createStorage(config);
      this.currentConfig = config;
      return this.instance;
    } catch (error) {
      throw new StorageError(`Failed to initialize storage: ${error}`, 'mmkv');
    }
  }

  /**
   * Get the current storage instance
   */
  static getInstance(): IStorage {
    if (!this.instance) {
      throw new StorageError('Storage not initialized', 'mmkv');
    }
    return this.instance;
  }

  /**
   * Switch to a different storage implementation
   */
  static switchStorage(config: StorageConfig): IStorage {
    this.instance = null;
    return this.initialize(config);
  }

  /**
   * Get current storage configuration
   */
  static getCurrentConfig(): StorageConfig | null {
    return this.currentConfig;
  }

  /**
   * Create a storage instance based on the configuration
   */
  private static createStorage(config: StorageConfig): IStorage {
    switch (config.type) {
      case 'mmkv':
        return new MMKVStorageImpl(config.options);

      default:
        throw new StorageError(
          `Unsupported storage type: ${config.type}`,
          config.type as StorageType
        );
    }
  }

  /**
   * Check if current storage supports async operations
   */
  static supportsAsync(): boolean {
    const config = this.getCurrentConfig();
    return config?.type === 'mmkv';
  }

  /**
   * Check if current storage supports batch operations (synchronously)
   */
  static supportsBatch(): boolean {
    const instance = this.getInstance();
    // Check if the instance has both sync batch methods
    return (
      this.storageSupportsMethod(instance, 'getBatch') &&
      this.storageSupportsMethod(instance, 'setBatch')
    );
  }

  /**
   * Migrate data from one storage to another
   */
  static async migrateStorage(
    fromConfig: StorageConfig,
    toConfig: StorageConfig,
    keys?: string[]
  ): Promise<void> {
    const fromStorage = this.createStorage(fromConfig);
    const toStorage = this.createStorage(toConfig);

    try {
      // Get all keys to migrate
      let keysToMigrate: string[] = [];

      if (keys) {
        keysToMigrate = keys;
      } else {
        // Always call getAllKeys for tests to verify it's called
        const allKeys =
          typeof fromStorage.getAllKeys === 'function' ? fromStorage.getAllKeys() : null;
        keysToMigrate = Array.isArray(allKeys) ? allKeys : [];
      }

      if (keysToMigrate.length === 0) {
        log.info('No data to migrate');
        return;
      }

      // Check if both storages support batch operations
      const fromSupportsBatch = this.storageSupportsMethod(fromStorage, 'getBatch');
      const toSupportsBatch = this.storageSupportsMethod(toStorage, 'setBatch');

      if (fromSupportsBatch && toSupportsBatch) {
        // Use batch operations for efficiency
        const data = fromStorage.getBatch(keysToMigrate);
        toStorage.setBatch(data);
      } else {
        // Migrate one by one
        for (const key of keysToMigrate) {
          const value = fromStorage.get(key);
          if (value !== null) {
            toStorage.set(key, value);
          }
        }
      }

      log.info(`Successfully migrated ${keysToMigrate.length} items`);
    } catch (error) {
      throw new StorageError(`Migration failed: ${error}`, toConfig.type);
    }
  }

  /**
   * Check if a storage instance supports a specific method
   */
  private static storageSupportsMethod(storage: IStorage, methodName: string): boolean {
    return typeof (storage as any)[methodName] === 'function';
  }
}

// Convenience methods for common configurations
export const createMMKVStorage = (options?: { id?: string; encryptionKey?: string }) =>
  StorageFactory.initialize({ type: 'mmkv', options });
