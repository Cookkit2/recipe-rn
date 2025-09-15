import type { IStorage, StorageConfig, StorageType } from "./storage-types";
import { StorageError } from "./storage-types";
import { MMKVStorage } from "./implementations/mmkv-storage";
import { AsyncStorageImpl } from "./implementations/async-storage-impl";

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
      throw new StorageError(
        `Failed to initialize storage: ${error}`,
        config.type
      );
    }
  }

  /**
   * Get the current storage instance
   */
  static getInstance(): IStorage {
    if (!this.instance) {
      // Default to AsyncStorage if no configuration is provided (Expo Go compatible)
      return this.initialize({ type: "async-storage" });
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
      case "mmkv":
        // MMKV not supported in Expo Go - fallback to AsyncStorage
        console.warn(
          "MMKV not supported in Expo Go, falling back to AsyncStorage"
        );
        return new AsyncStorageImpl();

      case "async-storage":
        return new AsyncStorageImpl();

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
    const storage = this.getInstance();
    return !!(storage.getAsync && storage.setAsync);
  }

  /**
   * Check if current storage supports batch operations
   */
  static supportsBatch(): boolean {
    const storage = this.getInstance();
    return !!(storage.getBatch && storage.setBatch);
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
      const keysToMigrate = keys || fromStorage.getAllKeys?.() || [];

      if (keysToMigrate.length === 0) {
        console.log("No data to migrate");
        return;
      }

      // Migrate data
      if (fromStorage.getBatch && toStorage.setBatch) {
        // Use batch operations if available
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

      console.log(`Successfully migrated ${keysToMigrate.length} items`);
    } catch (error) {
      throw new StorageError(`Migration failed: ${error}`, toConfig.type);
    }
  }
}

// Convenience methods for common configurations
// export const createMMKVStorage = (options?: {
//   id?: string;
//   encryptionKey?: string;
// }) => StorageFactory.initialize({ type: "mmkv", options }); // Commented out for Expo Go compatibility

export const createAsyncStorage = () =>
  StorageFactory.initialize({ type: "async-storage" });

export const createSQLiteStorage = (options?: {
  databaseName?: string;
  tableName?: string;
}) => StorageFactory.initialize({ type: "sqlite", options });

export const createWatermelonStorage = (options?: { databaseName?: string }) =>
  StorageFactory.initialize({ type: "watermelon", options });

export const createRealmStorage = (options?: {
  schemaVersion?: number;
  path?: string;
}) => StorageFactory.initialize({ type: "realm", options });
