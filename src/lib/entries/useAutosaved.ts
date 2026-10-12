import { useState } from 'react';
import { useDebouncedSave } from './useDebouncedSave';

/**
 * A text field that saves itself a moment after you stop typing. Spread
 * `props` onto an input or textarea; call `flush` before leaving the page.
 */
export function useAutosaved(initial: string, save: (value: string) => void) {
  const [value, setValue] = useState(initial);
  const { schedule, flush } = useDebouncedSave(save);
  const props = {
    value,
    onChange: (e: { target: { value: string } }) => {
      setValue(e.target.value);
      schedule(e.target.value);
    },
    onBlur: flush,
  };
  return { props, flush };
}
