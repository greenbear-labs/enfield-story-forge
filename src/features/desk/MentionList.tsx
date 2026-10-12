import { forwardRef, useImperativeHandle, useState } from 'react';

export interface MentionItem {
  id: string;
  label: string;
  /** e.g. "Character". */
  kind: string;
}

export interface MentionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/** The list that pops up after "@" (or "/") in an editor. Arrow keys move, Enter or Tab picks. */
export const MentionList = forwardRef<
  MentionListHandle,
  {
    items: MentionItem[];
    query: string;
    command: (item: { id: string; label: string }) => void;
    /** For lists other than the cast: their color, name, and what to say when nothing matches. */
    sec?: string;
    label?: string;
    empty?: (query: string) => string;
  }
>(function MentionList({ items, query, command, sec = 'char', label = 'Mention', empty }, ref) {
  const [state, setState] = useState({ items, active: 0 });
  // A new list of matches starts again at the top.
  const active = state.items === items ? state.active : 0;
  if (state.items !== items) setState({ items, active: 0 });
  const setActive = (i: number) => setState({ items, active: i });
  const pick = (i: number) => {
    const item = items[i];
    if (item) command({ id: item.id, label: item.label });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;
      if (event.key === 'ArrowDown') {
        setActive((active + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActive((active - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pick(active);
        return true;
      }
      return false;
    },
  }));

  return (
    <div data-sec={sec} className="menu static w-60" role="listbox" aria-label={label}>
      {items.length === 0 ? (
        <p className="px-2.5 py-1.5 text-[0.82rem] text-muted">
          {empty
            ? empty(query)
            : query
              ? `No one called “${query}” in your cast.`
              : 'Your cast is empty so far.'}
        </p>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={i === active}
            className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[0.9rem] ${
              i === active ? 'bg-accent-soft' : ''
            }`}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => {
              // Keep the editor's selection; pick on press.
              e.preventDefault();
              pick(i);
            }}
          >
            <span className="truncate">{item.label}</span>
            <span className="text-[0.72rem] text-muted">{item.kind}</span>
          </button>
        ))
      )}
    </div>
  );
});
