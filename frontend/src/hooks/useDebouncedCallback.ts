import { useCallback, useEffect, useRef } from 'react';
import { type Timeout } from 'node:timers';

export const useDebouncedCallback = <A extends unknown[] = unknown[], R = unknown, T extends (...args: A) => R = (...args: A) => R>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<Timeout | null>(null);

  // Update ref to callback if it changes.
  // This ensures the latest callback is always used.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount or if delay changes.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]); // Also re-setup if delay changes, though typically delay is constant.

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]); // The debounced function itself only depends on the delay.
};
