import { useEffect } from 'react';
import { useEntries } from '../../lib/entries/hooks';
import { structureFromEntry } from './customStructures';
import { setCustomStructures } from './structures';

/** Keeps the writer's own structures available wherever structures are looked up. */
export function CustomStructuresSync() {
  const live = useEntries('structure');
  useEffect(() => {
    if (live.data)
      setCustomStructures(
        live.data
          .map(structureFromEntry)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
      );
  }, [live.data]);
  return null;
}
