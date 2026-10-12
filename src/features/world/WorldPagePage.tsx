import { useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useCallback } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, saveBody, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useBody, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { PropField } from './PropField';
import { Breadcrumbs, EntryGate } from './WorldFrame';
import { columnsOf, itemName, propsOf } from './worldModel';

// The editor loads only when a page is opened.
const WorldEditor = lazy(() => import('./WorldEditor'));

/** One entry in an index: its values for the index's columns, and its own rich text. */
export function WorldPagePage({ pageId }: { pageId: string }) {
  const page = useEntry(pageId);
  const index = useEntry(page.data?.parentId ?? null);
  const notebook = useEntry(index.data?.parentId ?? null);
  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <Breadcrumbs notebook={notebook.data} index={index.data} />
      <EntryGate live={page} noun="page">
        {(p) => <WorldPage key={p.id} page={p} index={index.data ?? null} />}
      </EntryGate>
    </div>
  );
}

function WorldPage({ page, index }: { page: Entry; index: Entry | null }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const body = useBody(page.id);
  const title = useAutosaved(page.title, (v) => updateEntry(ws, page.id, { title: v.trim() }));
  const columns = index ? columnsOf(index) : [];
  const props = propsOf(page);
  const item = index ? itemName(index) : 'page';
  const onSave = useCallback(
    (doc: Record<string, unknown>) => {
      saveBody(ws, page.id, doc);
      // Touch the page so "recently updated" notices the writing.
      updateEntry(ws, page.id, {});
    },
    [ws, page.id],
  );

  const onDelete = () => {
    title.flush();
    trashEntry(ws, page.id);
    if (index) void navigate({ to: '/world/index/$indexId', params: { indexId: index.id } });
    else void navigate({ to: '/world' });
    toast('Page moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, page.id) },
    });
  };

  return (
    <article className="panel flex flex-col gap-4 border-t-4 border-t-accent">
      <div className="flex flex-col gap-1">
        <span className="label">{item.charAt(0).toUpperCase() + item.slice(1)}</span>
        <label>
          <span className="sr-only">Name</span>
          <input
            className="w-full border-0 bg-transparent p-0 font-display text-[1.8rem] font-semibold outline-none max-sm:text-[1.5rem]"
            placeholder="Untitled"
            autoFocus={!page.title}
            {...title.props}
          />
        </label>
      </div>
      {columns.length > 0 && (
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-4 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-1">
          {columns.map((c) => (
            <div key={c.id} className="contents">
              <dt className="label max-sm:mt-1.5">{c.name}</dt>
              <dd>
                <PropField pageId={page.id} column={c} value={props[c.id]} label={c.name} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="border-t border-line pt-4">
        {body.data === undefined ? (
          body.error ? (
            <EmptyState>
              Couldn’t load this page’s writing. Check your connection and reload.
            </EmptyState>
          ) : (
            <Loading />
          )
        ) : (
          <Suspense fallback={<Loading />}>
            <WorldEditor
              initial={body.data?.doc ?? null}
              onSave={onSave}
              label={`${page.title || 'Untitled'}: notes`}
            />
          </Suspense>
        )}
      </div>
      <div className="flex justify-end border-t border-line pt-3">
        <button type="button" className="btn btn-ghost btn-small" onClick={onDelete}>
          <Icon name="trash" size={14} />
          Delete page
        </button>
      </div>
    </article>
  );
}
