import type { StorageConfig } from ".";

/**
 * Storage configuration for different environments and use cases
 * You can easily switch between different storage implementations here
 */
export const storageConfigs: Record<string, StorageConfig> = {
  // Production configuration with AsyncStorage
  production: {
    type: "mmkv",
  },

  // Development configuration with AsyncStorage (Expo Go compatible)
  development: {
    type: "mmkv",
  },

  // AsyncStorage fallback (for compatibility)
  asyncStorage: {
    type: "async-storage",
  },

  // Encrypted storage for sensitive data (using AsyncStorage for now)
  encrypted: {
    type: "async-storage",
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
    return storageConfigs.development!;
  }

  return storageConfigs.production!;
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
