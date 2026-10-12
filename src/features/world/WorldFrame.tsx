import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { restoreEntry } from '../../lib/entries/entries';
import { entryRoute } from '../../lib/entries/entryLinks';
import type { Live } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { childrenOf } from './worldModel';

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
  const notebook = entries.find((e) => e.id === notebookId);
  if (!notebook) return null;
  return (
    <nav className="flex flex-col gap-0.5 text-[0.88rem]">
      <TreeLink entry={notebook} current={currentId === notebook.id} bold />
      <ul className="flex flex-col gap-0.5">
        {childrenOf(entries, notebookId, 'index').map((index) => (
          <TreeNode
            key={index.id}
            entry={index}
            entries={entries}
            currentId={currentId}
            open={open}
          />
        ))}
      </ul>
    </nav>
  );
}

function TreeLink({ entry, current, bold }: { entry: Entry; current: boolean; bold?: boolean }) {
  const route = entryRoute(entry);
  if (!route) return null;
  return (
    <Link
      {...route}
      aria-current={current ? 'page' : undefined}
      className={`flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 hover:bg-sunken ${
        current ? 'bg-accent-soft font-semibold text-accent' : ''
      } ${bold ? 'font-semibold' : ''}`}
    >
      {entry.icon && <span aria-hidden="true">{entry.icon}</span>}
      <span className="truncate">{fallback(entry)}</span>
    </Link>
  );
}

function TreeNode({
  entry,
  entries,
  currentId,
  open,
}: {
  entry: Entry;
  entries: Entry[];
  currentId: string;
  open: Set<string>;
}) {
  const kids = childrenOf(entries, entry.id, 'page');
  const [expanded, setExpanded] = useState(open.has(entry.id));
  return (
    <li className="flex flex-col">
      <span className="flex items-center">
        {kids.length > 0 ? (
          <button
            type="button"
            className="grid size-5 flex-none place-items-center rounded text-muted hover:bg-sunken"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} what’s in ${fallback(entry)}`}
            onClick={() => setExpanded(!expanded)}
          >
            <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>
              ›
            </span>
          </button>
        ) : (
          <span className="size-5 flex-none" />
        )}
        <TreeLink entry={entry} current={entry.id === currentId} />
      </span>
      {expanded && kids.length > 0 && (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-line pl-1">
          {kids.map((k) => (
            <TreeNode key={k.id} entry={k} entries={entries} currentId={currentId} open={open} />
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
