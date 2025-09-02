import { useCallback, useEffect, useRef } from "react";

interface UseDebounceOptions {
  delay?: number;
  immediate?: boolean;
}

/**
 * Custom hook for debouncing function calls
 * @param callback - The function to debounce
 * @param options - Configuration options
 * @returns Debounced function
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDebounce = <T extends (...args: any[]) => any>(
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
