import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a function that saves `delay` ms after the last call. A pending
 * save also runs on unmount, so leaving the page never drops a change.
 */
export function useDebouncedSave<T>(save: (value: T) => void, delay = 600) {
  const saveRef = useRef(save);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      saveRef.current(value);
    }
  }, []);

  useEffect(() => flush, [flush]);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  return { schedule, flush };
}
