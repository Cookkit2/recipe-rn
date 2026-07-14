import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import type { StorageConfig } from ".";
import { log } from "~/utils/logger";

const SECURE_STORE_KEY = "mmkv_encryption_key";
// Fallback override for tests/development
const TEST_ENV_KEY = "MMKV_ENCRYPTION_KEY";

function encodeBytesAsHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Captures the most recent SecureStore/Crypto failure so getEncryptedConfig can surface it.
let lastKeyError: unknown = null;

function getEncryptionKey(): string | undefined {
  // 1. Primary: per-device key via SecureStore (strongest — unique per install).
  //    On environments where the sync keychain call fails (e.g. the iOS 26.5 simulator,
  //    where getValueWithKeySync throws a FunctionCallException), this throws and we
  //    fall through to the env fallback below so the app still runs.
  try {
    // Try to get existing key
    let key = SecureStore.getItem(SECURE_STORE_KEY);

    if (!key) {
      // Generate a new cryptographically secure 256-bit (32 byte) key
      const bytes = Crypto.getRandomBytes(32);
      // Store as hex without relying on browser-only globals like btoa.
      key = encodeBytesAsHex(bytes);
      SecureStore.setItem(SECURE_STORE_KEY, key);
      log.info("Generated new per-device MMKV encryption key");
    }

    if (key) {
      return key;
    }
  } catch (error) {
    lastKeyError = error;
    console.error("[storage-config] SecureStore/Crypto failure:", error);
    log.error("Failed to access SecureStore for encryption key:", error);
    // fall through to the env fallback
  }

  // 2. Fallback: EXPO_PUBLIC_* key inlined from .env at build time. Used where
  //    SecureStore is unavailable. IMPORTANT: babel-preset-expo only inlines STATIC
  //    property access (`process.env.EXPO_PUBLIC_X`); computed access is NOT inlined
  //    and would always be undefined at runtime.
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY) {
    return process.env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY;
  }
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY;
  }

  // 3. Test/development override
  if (typeof process !== "undefined" && process.env?.[TEST_ENV_KEY]) {
    return process.env[TEST_ENV_KEY];
  }
  if (Constants.expoConfig?.extra?.[TEST_ENV_KEY]) {
    return Constants.expoConfig.extra[TEST_ENV_KEY];
  }

  return undefined;
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

export { getStorageConfig, storageFeatures };
