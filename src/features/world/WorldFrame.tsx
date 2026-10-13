import { Link } from '@tanstack/react-router';
import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { restoreEntry } from '../../lib/entries/entries';
import { entryRoute } from '../../lib/entries/entryLinks';
import type { Live } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { childrenOf, moveInTree, planTreeMove, type TreeDrop } from './worldModel';

const crumb = 'font-semibold text-accent hover:underline';
const fallback = (e: Entry) =>
  e.title.trim() ||
  (e.type === 'notebook'
    ? 'Untitled notebook'
    : e.type === 'index'
      ? 'Untitled index'
      : 'Untitled');

/** The path back up: Notebooks › notebook › index › page… */
export function Breadcrumbs({ trail = [] }: { trail?: Entry[] }) {
  return (
    <nav aria-label="Breadcrumbs" className="flex flex-wrap items-center gap-1 text-[0.85rem]">
      <Link to="/world" className={`inline-flex items-center gap-1 ${crumb}`}>
        <Icon name="arrowLeft" size={16} />
        Notebooks
      </Link>
      {trail.map((e) => {
        const route = entryRoute(e);
        return (
          route && (
            <span key={e.id} className="contents">
              <span className="text-muted">/</span>
              <Link {...route} className={crumb}>
                {fallback(e)}
              </Link>
            </span>
          )
        );
      })}
    </nav>
  );
}

/**
 * A notebook's pages with its tree on the side (on wide screens): the
 * notebook, its indexes, their pages, and the pages inside those.
 */
export function NotebookLayout({
  notebookId,
  currentId,
  trail,
  entries,
  children,
}: {
  notebookId: string | null;
  currentId: string;
  trail: Entry[];
  entries: Entry[] | undefined;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[230px_minmax(0,1fr)] items-start gap-6 max-[960px]:grid-cols-1">
      <aside
        aria-label="Notebook pages"
        className="no-print sticky top-[72px] max-h-[calc(100dvh-96px)] overflow-y-auto max-[960px]:hidden"
      >
        {notebookId && entries && (
          <NotebookTree
            notebookId={notebookId}
            currentId={currentId}
            open={new Set([...trail.map((e) => e.id), currentId])}
            entries={entries}
          />
        )}
      </aside>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  );
}

type DropWhere = 'before' | 'after' | 'into';

interface TreeDnd {
  entries: Entry[];
  currentId: string;
  expanded: Set<string>;
  toggle: (id: string) => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  hint: { id: string; where: DropWhere } | null;
  setHint: (hint: { id: string; where: DropWhere } | null) => void;
  drop: (target: Entry, where: DropWhere) => TreeDrop | null;
  move: (id: string, drop: TreeDrop) => void;
}

function NotebookTree({
  notebookId,
  currentId,
  open,
  entries,
}: {
  notebookId: string;
  currentId: string;
  open: Set<string>;
  entries: Entry[];
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const [expanded, setExpanded] = useState(() => new Set(open));
  const [dragId, setDragId] = useState<string | null>(null);
  const [hint, setHint] = useState<{ id: string; where: DropWhere } | null>(null);
  const notebook = entries.find((e) => e.id === notebookId);
  if (!notebook) return null;

  /** Where dropping the dragged item on `target` would put it, if it can go there. */
  const drop = (target: Entry, where: DropWhere): TreeDrop | null => {
    if (!dragId || dragId === target.id) return null;
    const plan: TreeDrop =
      where === 'into'
        ? { parentId: target.id, beforeId: null }
        : {
            parentId: target.parentId ?? '',
            beforeId:
              where === 'before'
                ? target.id
                : (() => {
                    const sibs = childrenOf(entries, target.parentId ?? '', target.type);
                    return sibs[sibs.findIndex((e) => e.id === target.id) + 1]?.id ?? null;
                  })(),
          };
    return planTreeMove(entries, dragId, plan) ? plan : null;
  };

  const move = (id: string, to: TreeDrop) => {
    if (!moveInTree(ws, entries, id, to)) return;
    // Show where it went.
    setExpanded((prev) => new Set(prev).add(to.parentId));
  };

  const dnd: TreeDnd = {
    entries,
    currentId,
    expanded,
    toggle: (id) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    dragId,
    setDragId,
    hint,
    setHint,
    drop,
    move,
  };

  return (
    <nav className="flex flex-col gap-0.5 text-[0.88rem]">
      <TreeLink entry={notebook} current={currentId === notebook.id} bold />
      <p id="tree-move-hint" className="sr-only">
        Drag to move it, or press Alt with the up or down arrow.
      </p>
      <ul className="flex flex-col gap-0.5">
        {childrenOf(entries, notebookId, 'index').map((index) => (
          <TreeNode key={index.id} entry={index} dnd={dnd} />
        ))}
      </ul>
    </nav>
  );
}

function TreeLink({
  entry,
  current,
  bold,
  onKeyDown,
}: {
  entry: Entry;
  current: boolean;
  bold?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLAnchorElement>) => void;
}) {
  const route = entryRoute(entry);
  if (!route) return null;
  return (
    <Link
      {...route}
      aria-current={current ? 'page' : undefined}
      aria-describedby={onKeyDown ? 'tree-move-hint' : undefined}
      onKeyDown={onKeyDown}
      draggable={false}
      className={`flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 hover:bg-sunken ${
        current ? 'bg-accent-soft font-semibold text-accent' : ''
      } ${bold ? 'font-semibold' : ''}`}
    >
      {entry.icon && <span aria-hidden="true">{entry.icon}</span>}
      <span className="truncate">{fallback(entry)}</span>
    </Link>
  );
}

function TreeNode({ entry, dnd }: { entry: Entry; dnd: TreeDnd }) {
  const { entries, currentId, expanded, dragId, hint } = dnd;
  const kids = childrenOf(entries, entry.id, 'page');
  const isOpen = expanded.has(entry.id);
  const shown = hint?.id === entry.id ? hint.where : null;

  const whereAt = (e: DragEvent<HTMLElement>): DropWhere => {
    const box = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - box.top) / box.height;
    return y < 0.3 ? 'before' : y > 0.7 ? 'after' : 'into';
  };

  /** Alt+Up and Alt+Down move it among its siblings. */
  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const sibs = childrenOf(entries, entry.parentId ?? '', entry.type);
    const i = sibs.findIndex((s) => s.id === entry.id);
    const to = e.key === 'ArrowUp' ? i - 1 : i + 2;
    if (to < 0 || to > sibs.length) return;
    dnd.move(entry.id, { parentId: entry.parentId ?? '', beforeId: sibs[to]?.id ?? null });
    // Keep focus on it after the tree re-renders.
    const target = e.currentTarget;
    requestAnimationFrame(() => target.focus());
  };

  return (
    <li className="flex flex-col">
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', entry.id);
          dnd.setDragId(entry.id);
        }}
        onDragEnd={() => {
          dnd.setDragId(null);
          dnd.setHint(null);
        }}
        onDragOver={(e) => {
          if (!dragId) return;
          let where = whereAt(e);
          // An index can't hold another index: the middle means after.
          if (where === 'into' && entries.find((x) => x.id === dragId)?.type === 'index')
            where = 'after';
          if (!dnd.drop(entry, where)) {
            if (shown) dnd.setHint(null);
            return;
          }
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (shown !== where) dnd.setHint({ id: entry.id, where });
        }}
        onDragLeave={() => shown && dnd.setHint(null)}
        onDrop={(e) => {
          e.preventDefault();
          const to = hint?.id === entry.id ? dnd.drop(entry, hint.where) : null;
          if (dragId && to) dnd.move(dragId, to);
          dnd.setDragId(null);
          dnd.setHint(null);
        }}
        className={`flex items-center rounded border-y-2 border-transparent ${
          dragId === entry.id ? 'opacity-50' : ''
        } ${shown === 'before' ? '!border-t-accent' : ''} ${
          shown === 'after' ? '!border-b-accent' : ''
        } ${shown === 'into' ? 'bg-accent-soft' : ''}`}
      >
        {kids.length > 0 ? (
          <button
            type="button"
            className="grid size-5 flex-none place-items-center rounded text-muted hover:bg-sunken"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Hide' : 'Show'} what’s in ${fallback(entry)}`}
            onClick={() => dnd.toggle(entry.id)}
          >
            <span className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>
              ›
            </span>
          </button>
        ) : (
          <span className="size-5 flex-none" />
        )}
        <TreeLink entry={entry} current={entry.id === currentId} onKeyDown={onKeyDown} />
      </span>
      {isOpen && kids.length > 0 && (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-line pl-1">
          {kids.map((k) => (
            <TreeNode key={k.id} entry={k} dnd={dnd} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Shows loading, missing, and trashed states, then the entry once it's here. */
export function EntryGate({
  live,
  noun,
  children,
}: {
  live: Live<Entry | null>;
  noun: string;
  children: (entry: Entry) => ReactNode;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const entry = live.data;
  if (entry === undefined)
    return live.error ? (
      <EmptyState>Couldn’t load this {noun}. Check your connection and reload.</EmptyState>
    ) : (
      <Loading />
    );
  if (entry === null)
    return (
      <EmptyState>This {noun} isn’t here. It may have been deleted on another device.</EmptyState>
    );
  if (entry.deletedAt)
    return (
      <div className="empty-state flex flex-col items-center gap-3">
        <p>This {noun} is in the trash.</p>
        <button type="button" className="btn" onClick={() => restoreEntry(ws, entry.id)}>
          Restore it
        </button>
      </div>
    );
  return children(entry);
}
