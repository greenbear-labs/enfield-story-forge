import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { cardGrid } from '../shards/ShardCard';
import { NewNotebookDialog } from './NewNotebookDialog';
import { notebookDescription } from './worldModel';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** World Creator's front page: your notebooks. */
export function WorldHomePage() {
  const entries = useEntries();
  const [creating, setCreating] = useState(false);

  const notebooks = useMemo(() => {
    const live = entries.data ?? [];
    const indexes = live.filter((e) => e.type === 'index');
    const pages = live.filter((e) => e.type === 'page');
    return live
      .filter((e) => e.type === 'notebook')
      .sort(recentlyUpdatedFirst)
      .map((notebook) => ({
        notebook,
        indexes: indexes.filter((i) => i.parentId === notebook.id).length,
        // Pages inside pages count too: every page knows its notebook.
        pages: pages.filter((p) => p.fields.notebookId === notebook.id).length,
      }));
  }, [entries.data]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[640px] flex-col gap-1">
          <span className="label text-accent">Enfield</span>
          <h1 className="text-[1.9rem] max-sm:text-[1.5rem]">World Creator</h1>
          <p className="text-muted">
            Notebooks of anything: the places, peoples, creatures, and magic of a story world, a
            game campaign, or research for a book. Each index is a table, a gallery, or a list, and
            every entry is a full page.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + New notebook
        </button>
      </header>

      <section className="flex flex-col gap-2.5" aria-label="Notebooks">
        <h2 className="text-[1.05rem]">Your notebooks</h2>
        {entries.error ? (
          <EmptyState>Couldn’t load your notebooks. Check your connection and reload.</EmptyState>
        ) : entries.data === undefined ? (
          <Loading />
        ) : notebooks.length === 0 ? (
          <EmptyState>
            No notebooks yet. Start one for a story world, a game campaign, or your research.
          </EmptyState>
        ) : (
          <div className={cardGrid}>
            {notebooks.map(({ notebook, indexes, pages }) => (
              <Link
                key={notebook.id}
                to="/world/$notebookId"
                params={{ notebookId: notebook.id }}
                className="entry-card"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-[1.3rem]">
                    {notebook.icon ?? '📓'}
                  </span>
                  <b className="font-display text-[1.05rem]">
                    {notebook.title || 'Untitled notebook'}
                  </b>
                </span>
                {notebookDescription(notebook) && (
                  <p className="text-[0.88rem] text-muted">{notebookDescription(notebook)}</p>
                )}
                <span className="mt-auto font-mono text-[0.78rem] text-muted">
                  {plural(indexes, 'index', 'indexes')} · {plural(pages, 'page')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      {creating && <NewNotebookDialog onClose={() => setCreating(false)} />}
    </>
  );
}
