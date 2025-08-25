import type { StorageConfig } from "./storage";

/**
 * Storage configuration for different environments and use cases
 * You can easily switch between different storage implementations here
 */
export const storageConfigs: Record<string, StorageConfig> = {
  // Production configuration with MMKV
  production: {
    type: "mmkv",
    options: {
      id: "recipe-app-production",
      // encryptionKey: process.env.STORAGE_ENCRYPTION_KEY, // Add encryption for production
    },
  },

  // Development configuration
  development: {
    type: "mmkv",
    options: {
      id: "recipe-app-dev",
    },
  },

  // AsyncStorage fallback (for compatibility)
  asyncStorage: {
    type: "async-storage",
  },

  // SQLite for complex queries (when you need it)
  sqlite: {
    type: "sqlite",
    options: {
      databaseName: "recipe-app.db",
      tableName: "app_storage",
    },
  },

  // WatermelonDB for advanced use cases
  watermelon: {
    type: "watermelon",
    options: {
      databaseName: "recipe-app-watermelon",
    },
  },

  // Realm for object database needs
  realm: {
    type: "realm",
    options: {
      schemaVersion: 1,
      path: "recipe-app.realm",
    },
  },

  // Encrypted storage for sensitive data
  encrypted: {
    type: "mmkv",
    options: {
      id: "recipe-app-encrypted",
      encryptionKey: "your-super-secret-encryption-key-here",
    },
  },
};

/**
 * Get the appropriate storage config based on environment or feature flags
 */
export function getStorageConfig(): StorageConfig {
  // You can add logic here to choose the config based on:
  // - Environment (development, production)
  // - Feature flags
  // - User preferences
  // - Device capabilities

  if (__DEV__) {
    return storageConfigs.development;
  }

  return storageConfigs.production;
}

/**
 * Storage feature flags for different parts of your app
 */
export const storageFeatures = {
  // Use encrypted storage for sensitive user data
  useEncryptedForUserData: false,

  // Use SQLite for complex recipe queries
  useSQLiteForRecipes: false,

  // Use batch operations for better performance
  useBatchOperations: true,

  // Enable storage migration between types
  enableMigration: true,
};
