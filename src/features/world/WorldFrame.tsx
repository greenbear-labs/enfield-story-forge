import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import type { Live } from '../../lib/entries/hooks';
import { restoreEntry } from '../../lib/entries/entries';
import { useAuthStore } from '../auth/authStore';

/** The path back up: World Creator › notebook › index. */
export function Breadcrumbs({
  notebook,
  index,
}: {
  notebook?: Entry | null;
  index?: Entry | null;
}) {
  const cls = 'font-semibold text-accent hover:underline';
  return (
    <nav aria-label="Breadcrumbs" className="flex flex-wrap items-center gap-1 text-[0.85rem]">
      <Link to="/world" className={`inline-flex items-center gap-1 ${cls}`}>
        <Icon name="arrowLeft" size={16} />
        Notebooks
      </Link>
      {notebook && (
        <>
          <span className="text-muted">/</span>
          <Link to="/world/$notebookId" params={{ notebookId: notebook.id }} className={cls}>
            {notebook.title || 'Untitled notebook'}
          </Link>
        </>
      )}
      {index && (
        <>
          <span className="text-muted">/</span>
          <Link to="/world/index/$indexId" params={{ indexId: index.id }} className={cls}>
            {index.title || 'Untitled index'}
          </Link>
        </>
      )}
    </nav>
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
