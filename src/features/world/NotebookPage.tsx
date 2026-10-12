import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { cardGrid } from '../shards/ShardCard';
import { AddIndexDialog } from './AddIndexDialog';
import { Breadcrumbs, EntryGate, NotebookLayout } from './WorldFrame';
import { childrenOf, indexPreset, notebookDescription, trashAll, treeIds } from './worldModel';

/** A notebook: its indexes, as cards. */
export function NotebookPage({ notebookId }: { notebookId: string }) {
  const notebook = useEntry(notebookId);
  const entries = useEntries();
  return (
    <NotebookLayout
      notebookId={notebookId}
      currentId={notebookId}
      trail={[]}
      entries={entries.data}
    >
      <Breadcrumbs />
      <EntryGate live={notebook} noun="notebook">
        {(n) => <Notebook key={n.id} notebook={n} />}
      </EntryGate>
    </NotebookLayout>
  );
}

function Notebook({ notebook }: { notebook: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const entries = useEntries();
  const [adding, setAdding] = useState(false);
  const title = useAutosaved(notebook.title, (v) =>
    updateEntry(ws, notebook.id, { title: v.trim() || 'Untitled notebook' }),
  );
  const description = useAutosaved(notebookDescription(notebook), (v) =>
    updateEntry(ws, notebook.id, {}, { description: v.trim() }),
  );

  const indexes = useMemo(() => {
    const pages = (entries.data ?? []).filter((e) => e.type === 'page');
    return childrenOf(entries.data, notebook.id, 'index').map((index) => ({
      index,
      pages: pages.filter((p) => p.parentId === index.id).length,
    }));
  }, [entries.data, notebook.id]);

  const onDelete = () => {
    title.flush();
    description.flush();
    const undo = trashAll(ws, treeIds(entries.data, notebook.id));
    void navigate({ to: '/world' });
    toast('Notebook moved to the trash, with everything in it.', {
      action: { label: 'Undo', onClick: undo },
    });
  };

  return (
    <>
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="pt-1 text-[1.8rem]">
          {notebook.icon ?? '📓'}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label>
            <span className="sr-only">Notebook name</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.8rem] font-semibold outline-none max-sm:text-[1.5rem]"
              {...title.props}
            />
          </label>
          <label>
            <span className="sr-only">What it’s for</span>
            <input
              className="w-full border-0 bg-transparent p-0 text-muted outline-none"
              placeholder="What this notebook is for"
              {...description.props}
            />
          </label>
        </div>
        <Menu
          label="Notebook"
          align="right"
          trigger={(props) => (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label="Notebook options"
              {...props}
            >
              <Icon name="more" />
            </button>
          )}
        >
          {() => (
            <button type="button" role="menuitem" className="menu-item" onClick={onDelete}>
              <Icon name="trash" size={16} />
              Delete notebook
            </button>
          )}
        </Menu>
      </header>

      <section className="flex flex-col gap-2.5" aria-label="Indexes">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[1.05rem]">Indexes</h2>
          <button type="button" className="btn btn-small" onClick={() => setAdding(true)}>
            + Add an index
          </button>
        </div>
        {indexes.length === 0 ? (
          <EmptyState>
            No indexes yet. Add one for each kind of thing in this notebook: places, peoples, ships,
            spells, anything.
          </EmptyState>
        ) : (
          <div className={cardGrid}>
            {indexes.map(({ index, pages }) => (
              <Link
                key={index.id}
                to="/world/index/$indexId"
                params={{ indexId: index.id }}
                className="entry-card"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-[1.2rem]">
                    {index.icon ?? '📄'}
                  </span>
                  <b className="font-display text-[1.02rem]">{index.title || 'Untitled index'}</b>
                  <span className="ml-auto font-mono text-[0.78rem] text-muted">{pages}</span>
                </span>
                {indexPreset(index).key !== 'custom' && (
                  <p className="text-[0.85rem] text-muted">{indexPreset(index).blurb}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
      {adding && <AddIndexDialog notebookId={notebook.id} onClose={() => setAdding(false)} />}
    </>
  );
}
