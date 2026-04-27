import { useCallback, useEffect, useRef } from "react";

/**
 * Configuration options for the debounce hook
 */
interface UseDebounceOptions {
  /**
   * Delay in milliseconds before invoking the callback
   * @default 300
   */
  delay?: number;
  /**
   * Whether to invoke the callback on the leading edge (immediately on first call)
   * @default true
   */
  immediate?: boolean;
}

/**
 * Custom hook for debouncing function calls.
 *
 * Debouncing ensures that a function is not called too frequently, waiting for a pause
 * in calls before executing. This is useful for search inputs, auto-save, and other
 * performance-critical scenarios.
 *
 * When `immediate` is true, the callback executes on the first call (leading edge)
 * and then waits for the delay period before allowing another call. When false,
 * the callback only executes after the delay period has elapsed (trailing edge).
 *
 * @param callback - The function to debounce
 * @param options - Configuration options for debounce behavior
 * @returns A debounced version of the callback function
 *
 * @example
 * ```tsx
 * const handleSearch = useDebounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, { delay: 500 });
 *
 * // In component
 * <TextInput onChangeText={handleSearch} />
 * ```
 *
 * @example
 * ```tsx
 * // Debounce with trailing edge only (no immediate execution)
 * const handleSave = useDebounce(() => {
 *   saveToDatabase();
 * }, { delay: 1000, immediate: false });
 * ```
 */

const useDebounce = <T extends (...args: never[]) => unknown>(
  callback: T,
  options: UseDebounceOptions = {}
): T => {
  const { delay = 300, immediate = true } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callOnLeadingEdge = useRef(true);
  const isMounted = useRef(true);

  // Track mount state and clear any pending timeout on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const callNow = immediate && callOnLeadingEdge.current;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Call immediately if it's the leading edge and immediate is true
      if (callNow && isMounted.current) {
        callOnLeadingEdge.current = false;
        callback(...args);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        callOnLeadingEdge.current = true;

        // Call on trailing edge if immediate is false
        if (!immediate) {
          callback(...args);
        }
      }, delay);
    },
    [callback, delay, immediate]
  );

  return debouncedCallback as T;
};

export default useDebounce;
