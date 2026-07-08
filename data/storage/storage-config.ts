import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { StorageConfig } from ".";
import { log } from "~/utils/logger";

const SECURE_STORE_KEY = "mmkv_encryption_key";
// Fallback override for tests/development
const TEST_ENV_KEY = "MMKV_ENCRYPTION_KEY";

// Captures the most recent SecureStore/Crypto failure so getEncryptedConfig can surface it.
let lastKeyError: unknown = null;

function getEncryptionKey(): string | undefined {
  // Primary: EXPO_PUBLIC_* key inlined from .env at build time (no Keychain dependency,
  // so it works even where per-device SecureStore generation is unavailable — e.g. the simulator).
  // IMPORTANT: babel-preset-expo only inlines STATIC property access
  // (`process.env.EXPO_PUBLIC_X`). Computed access (`process.env[SOME_VAR]`) is NOT inlined
  // and would always be undefined at runtime.
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY) {
    return process.env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY;
  }
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY;
  }

  // Test override
  if (typeof process !== "undefined" && process.env?.[TEST_ENV_KEY]) {
    return process.env[TEST_ENV_KEY];
  }

  if (Constants.expoConfig?.extra?.[TEST_ENV_KEY]) {
    return Constants.expoConfig.extra[TEST_ENV_KEY];
  }

  try {
    // Try to get existing key
    let key = SecureStore.getItem(SECURE_STORE_KEY);

    if (!key) {
      // Generate a new secure 32+ char key using crypto if one doesn't exist
      // randomUUID is 36 chars long (with dashes), which meets our > 32 length requirement
      key = Crypto.randomUUID() + "-" + Crypto.randomUUID().substring(0, 8);
      SecureStore.setItem(SECURE_STORE_KEY, key);
      log.info("Generated new per-device MMKV encryption key");
    }

    return key;
  } catch (error) {
    lastKeyError = error;
    console.error("[storage-config] SecureStore/Crypto failure:", error);
    log.error("Failed to access SecureStore for encryption key:", error);
    // If SecureStore fails (e.g. during certain testing environments), we'll return undefined
    // which will be caught by getEncryptedConfig's validation
    return undefined;
  }
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
      "CRITICAL: Encryption key could not be generated or retrieved for encrypted auth storage. Sensitive credentials cannot be stored without encryption. Underlying error: " +
        (lastKeyError instanceof Error ? lastKeyError.message : String(lastKeyError))
    );
  }

  // Validate encryption key format and strength
  if (key.length < 32) {
    throw new Error(
      `CRITICAL: Encryption key must be at least 32 characters. Current length: ${key.length}. Use a strong, randomly generated key.`
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
function getStorageConfig(): StorageConfig {
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
const storageFeatures = {
  // Use encrypted storage for sensitive user data
  useEncryptedForUserData: __DEV__,

  // Use SQLite for complex recipe queries
  useSQLiteForRecipes: false,

  // Use batch operations for better performance
  useBatchOperations: true,

  // Enable storage migration between types
  enableMigration: true,
};
