import Constants from "expo-constants";
import type { StorageConfig } from ".";
import { log } from "~/utils/logger";

const ENCRYPTION_KEY_ENV = "EXPO_PUBLIC_MMKV_ENCRYPTION_KEY";

function getEncryptionKey(): string | undefined {
  return (
    (typeof process !== "undefined" && process.env?.[ENCRYPTION_KEY_ENV]) ||
    Constants.expoConfig?.extra?.[ENCRYPTION_KEY_ENV]
  );
}

/**
 * Storage configuration for different environments and use cases
 * You can easily switch between different storage implementations here
 */
export const storageConfigs: Record<string, StorageConfig> = {
  production: {
    type: "mmkv",
  },

  development: {
    type: "mmkv",
  },

  encrypted: (() => {
    const key = getEncryptionKey();
    if (!key) {
      log.warn(
        "[storage-config] No encryption key found. Set EXPO_PUBLIC_MMKV_ENCRYPTION_KEY (env or app.json extra) for encrypted auth storage. Using non-encrypted MMKV for this instance."
      );
    }
    return {
      type: "mmkv" as const,
      options: {
        id: "encrypted",
        ...(key && { encryptionKey: key }),
      },
    };
  })(),
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
