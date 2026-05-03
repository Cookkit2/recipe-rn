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
 * Get encrypted storage configuration with lazy validation
 * Defers encryption key check until storage is actually accessed
 * to avoid timing issues with Expo's environment initialization
 */
function getEncryptedConfig(): StorageConfig {
  const key = getEncryptionKey();

  // Always require encryption key for sensitive data storage
  if (!key) {
    throw new Error(
      "CRITICAL: EXPO_PUBLIC_MMKV_ENCRYPTION_KEY must be set for encrypted auth storage. Sensitive credentials cannot be stored without encryption."
    );
  }

  // Validate encryption key format and strength
  if (key.length < 32) {
    throw new Error(
      `CRITICAL: EXPO_PUBLIC_MMKV_ENCRYPTION_KEY must be at least 32 characters. Current length: ${key.length}. Use a strong, randomly generated key.`
    );
  }

  // Validate key contains sufficient entropy (mix of character types)
  const hasUpperCase = /[A-Z]/.test(key);
  const hasLowerCase = /[a-z]/.test(key);
  const hasNumbers = /\d/.test(key);
  const hasSpecial = /[^A-Za-z0-9]/.test(key);

  const characterTypes = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(
    Boolean
  ).length;
  if (characterTypes < 3) {
    log.warn(
      "[storage-config] Encryption key should contain at least 3 of: uppercase, lowercase, numbers, special characters for optimal security."
    );
  }

  return {
    type: "mmkv" as const,
    options: {
      id: "encrypted",
      encryptionKey: key,
    },
  };
}

/**
 * Storage configuration for different environments and use cases
 * You can easily switch between different storage implementations here
 *
 * Note: 'encrypted' config uses a getter to defer validation until first access,
 * avoiding timing issues with Expo environment initialization
 */
export const storageConfigs: Record<string, StorageConfig> = {
  production: {
    type: "mmkv",
  },

  development: {
    type: "mmkv",
  },

  // Getter defers encryption key validation until runtime when first accessed
  get encrypted(): StorageConfig {
    return getEncryptedConfig();
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
