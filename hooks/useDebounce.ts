import { useCallback, useRef } from 'react';

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
const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebounceOptions = {}
): T => {
  const { delay = 300, immediate = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callOnLeadingEdge = useRef(true);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const callNow = immediate && callOnLeadingEdge.current;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Call immediately if it's the leading edge and immediate is true
      if (callNow) {
        callOnLeadingEdge.current = false;
        callback(...args);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
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
