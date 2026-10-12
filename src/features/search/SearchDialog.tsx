import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { ENTRY_SECTION } from '../../data/types';
import { entryRoute, entryTypeName } from '../../lib/entries/entryLinks';
import { useEntries } from '../../lib/entries/hooks';
import { matchesQuery, recentlyUpdatedFirst } from '../../lib/entries/model';

const MAX_RESULTS = 30;

/** Search everything you've made. Works offline: it reads the local cache. */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const entries = useEntries();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(
    () =>
      (entries.data ?? [])
        .filter((e) => entryRoute(e) && matchesQuery(e, query))
        .sort(recentlyUpdatedFirst)
        .slice(0, MAX_RESULTS),
    [entries.data, query],
  );
  const current = Math.min(active, Math.max(0, results.length - 1));

  const open = (index: number) => {
    const entry = results[index];
    const route = entry && entryRoute(entry);
    if (!route) return;
    onClose();
    void navigate(route);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(current + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      open(current);
    }
  };

  return (
    <Dialog title="Search" onClose={onClose} wide>
      <input
        type="search"
        className="txt"
        placeholder="Search shards, groups, and #tags"
        aria-label="Search everything"
        aria-controls="search-results"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul id="search-results" role="listbox" aria-label="Results" className="flex flex-col gap-1">
        {entries.data === undefined ? (
          <li className="py-3 text-center text-muted">Loading…</li>
        ) : results.length === 0 ? (
          <li className="py-3 text-center text-muted">
            {query ? 'Nothing matches.' : 'Nothing here yet.'}
          </li>
        ) : (
          results.map((e, i) => (
            <li
              key={e.id}
              role="option"
              aria-selected={i === current}
              data-sec={ENTRY_SECTION[e.type]}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ${
                i === current ? 'bg-accent-soft' : ''
              }`}
              onPointerEnter={() => setActive(i)}
              onClick={() => open(i)}
            >
              <span className="chip flex-none">{entryTypeName(e.type)}</span>
              <span className="min-w-0 flex-1 truncate">{e.title || 'Untitled'}</span>
            </li>
          ))
        )}
      </ul>
    </Dialog>
  );
}
