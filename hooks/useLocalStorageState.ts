import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storage } from "~/data";
import { log } from "~/utils/logger";
import { safeJsonParse } from "~/utils/json-parsing";

/**
 * In-memory fallback storage used when persistent storage throws an error.
 * Provides graceful degradation when storage operations fail.
 */
export const inMemoryData = new Map<string, unknown>();

/**
 * Configuration options for useLocalStorageState hook
 * @template T - Type of the stored value
 */
export type LocalStorageOptions<T> = {
  /** Default value to use if no stored value exists. Can be a value or a function that returns a value */
  defaultValue?: T | (() => T);
  /** Custom serialization functions for storing and parsing values */
  serializer?: {
    /** Function to convert value to string for storage */
    stringify: (value: unknown) => string;
    /** Function to parse stored string back to value */
    parse: (value: string) => unknown;
  };
};

/**
 * Return type for useLocalStorageState hook
 * First two values match useState pattern, third value contains metadata
 * @template T - Type of the stored value
 */
export type LocalStorageState<T> = [
  T,
  Dispatch<SetStateAction<T>>,
  {
    isPersistent: boolean;
    removeItem: () => void;
    isLoading: boolean;
  },
];

/**
 * Custom hook for managing persistent local storage state with in-memory fallback
 *
 * Provides useState-like API with automatic persistence to local storage.
 * Falls back to in-memory storage if persistent storage operations fail.
 * Handles serialization/deserialization with JSON by default or custom serializers.
 *
 * @template T - Type of the stored value
 * @param key - Storage key for persisting the value
 * @param options - Configuration options including default value and serializers
 * @returns Tuple containing [value, setValue, { isPersistent, removeItem, isLoading }]
 * - value: Current stored value (or default value if none exists)
 * - setValue: Function to update the value (persists to storage)
 * - isPersistent: Boolean indicating if value is successfully persisted (false = in-memory fallback)
 * - removeItem: Function to delete the value from storage and reset to default
 * - isLoading: Boolean indicating if initial value is being loaded from storage
 *
 * @example
 * ```ts
 * const [theme, setTheme, { isPersistent, removeItem, isLoading }] = useLocalStorageState('theme', {
 *   defaultValue: 'light'
 * });
 * ```
 */
export default function useLocalStorageState(
  key: string,
  options?: LocalStorageOptions<undefined>
): LocalStorageState<unknown>;
export default function useLocalStorageState<T>(
  key: string,
  options?: Omit<LocalStorageOptions<T | undefined>, "defaultValue">
): LocalStorageState<T | undefined>;
export default function useLocalStorageState<T>(
  key: string,
  options?: LocalStorageOptions<T>
): LocalStorageState<T>;
export default function useLocalStorageState<T = undefined>(
  key: string,
  options?: LocalStorageOptions<T | undefined>
): LocalStorageState<T | undefined> {
  const serializer = options?.serializer;
  const [defaultValue] = useState(options?.defaultValue);
  return useAsyncStorage(key, defaultValue, serializer?.parse, serializer?.stringify);
}

function useAsyncStorage<T>(
  key: string,
  defaultValue: T | undefined,
  parse: (value: string) => unknown = parseJSON,
  stringify: (value: unknown) => string = JSON.stringify
): LocalStorageState<T | undefined> {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isPersistent, setIsPersistent] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value from storage
  useEffect(() => {
    let mounted = true;

    const loadValue = async () => {
      try {
        if (inMemoryData.has(key)) {
          if (mounted) {
            setValue(inMemoryData.get(key) as T | undefined);
            setIsPersistent(false);
            setIsLoading(false);
          }
          return;
        }

        const storedValue = storage.getString(key);

        if (mounted) {
          if (storedValue !== null) {
            try {
              const parsed = parse(storedValue) as T;
              setValue(parsed);
            } catch (error) {
              log.error(`Error parsing stored value for key "${key}":`, error);
              setValue(defaultValue);
            }
          } else if (defaultValue !== undefined) {
            // Store default value if nothing is stored yet
            try {
              storage.setString(key, stringify(defaultValue));
              setValue(defaultValue);
            } catch (error) {
              log.error(`Error storing default value for key "${key}":`, error);
              inMemoryData.set(key, defaultValue);
              setValue(defaultValue);
              setIsPersistent(false);
            }
          }
        }
      } catch (error) {
        log.error(`Error loading value for key "${key}":`, error);
        if (mounted) {
          inMemoryData.set(key, defaultValue);
          setValue(defaultValue);
          setIsPersistent(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only run on mount and when key changes

  const setState = useCallback(
    (newValue: SetStateAction<T | undefined>): void => {
      setValue((currentValue) => {
        const resolvedValue = newValue instanceof Function ? newValue(currentValue) : newValue;

        // Async update to storage
        (async () => {
          try {
            storage.setString(key, stringify(resolvedValue));
            inMemoryData.delete(key);
            setIsPersistent(true);
          } catch (error) {
            log.error(`Error saving value for key "${key}":`, error);
            inMemoryData.set(key, resolvedValue);
            setIsPersistent(false);
          }
        })();

        return resolvedValue;
      });
    },
    [key, stringify]
  );

  const removeItem = useCallback(() => {
    try {
      storage.delete(key);
      inMemoryData.delete(key);
      setValue(defaultValue);
      setIsPersistent(true);
    } catch (error) {
      log.error(`Error removing value for key "${key}":`, error);
      inMemoryData.delete(key);
      setValue(defaultValue);
    }
  }, [key, defaultValue]);

  return useMemo(
    () => [
      value,
      setState,
      {
        isPersistent,
        removeItem,
        isLoading,
      },
    ],
    [value, setState, isPersistent, removeItem, isLoading]
  );
}

/**
 * JSON parser that handles undefined values correctly
 *
 * Standard JSON.parse cannot handle the string "undefined" properly.
 * This wrapper converts "undefined" strings to actual undefined values.
 *
 * @param value - String value to parse
 * @returns Parsed value, or undefined if input is "undefined" string
 */
function parseJSON(value: string): unknown {
  return value === "undefined" ? undefined : safeJsonParse(value, undefined);
}
