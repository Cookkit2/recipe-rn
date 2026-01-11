import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storage } from "~/data";
import { log } from "~/utils/logger";

// in memory fallback used when storage throws an error
export const inMemoryData = new Map<string, unknown>();

export type LocalStorageOptions<T> = {
  defaultValue?: T | (() => T);
  serializer?: {
    stringify: (value: unknown) => string;
    parse: (value: string) => unknown;
  };
};

// - `useLocalStorageState()` return type
// - first two values are the same as `useState`
export type LocalStorageState<T> = [
  T,
  Dispatch<SetStateAction<T>>,
  {
    isPersistent: boolean;
    removeItem: () => void;
  },
];

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
  return useAsyncStorage(
    key,
    defaultValue,
    serializer?.parse,
    serializer?.stringify
  );
}

function useAsyncStorage<T>(
  key: string,
  defaultValue: T | undefined,
  parse: (value: string) => unknown = parseJSON,
  stringify: (value: unknown) => string = JSON.stringify
): LocalStorageState<T | undefined> {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isPersistent, setIsPersistent] = useState(true);

  // Load initial value from storage
  useEffect(() => {
    let mounted = true;

    const loadValue = async () => {
      try {
        if (inMemoryData.has(key)) {
          if (mounted) {
            setValue(inMemoryData.get(key) as T | undefined);
            setIsPersistent(false);
          }
          return;
        }

        const storedValue = storage.get<string>(key);

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
              storage.set(key, stringify(defaultValue));
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
      }
    };

    loadValue();

    return () => {
      mounted = false;
    };
  }, [key]); // Only run on mount and when key changes

  const setState = useCallback(
    (newValue: SetStateAction<T | undefined>): void => {
      setValue((currentValue) => {
        const resolvedValue =
          newValue instanceof Function ? newValue(currentValue) : newValue;

        // Async update to storage
        (async () => {
          try {
            storage.set(key, stringify(resolvedValue));
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
      },
    ],
    [value, setState, isPersistent, removeItem]
  );
}

// a wrapper for `JSON.parse()` that supports "undefined" value. otherwise,
// `JSON.parse(JSON.stringify(undefined))` returns the string "undefined" not the value `undefined`
function parseJSON(value: string): unknown {
  return value === "undefined" ? undefined : JSON.parse(value);
}
