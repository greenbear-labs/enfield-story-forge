import { Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import { ENTRY_SECTION, type Entry } from '../../data/types';
import { saveBody, updateEntry } from '../../lib/entries/entries';
import { entryRoute, entryTypeName } from '../../lib/entries/entryLinks';
import { useBody, useEntries, useEntry, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { byOrder } from '../../lib/entries/model';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { AppearsIn } from '../desk/AppearsIn';
import { syncMentions } from '../desk/deskModel';
import { PropField } from './PropField';
import { Breadcrumbs, EntryGate, NotebookLayout } from './WorldFrame';
import type { WorldSave } from './WorldEditor';
import {
  addSubpage,
  childrenOf,
  columnsOf,
  linkables,
  pageKind,
  propsOf,
  trailOf,
  trashAll,
  treeIds,
} from './worldModel';

// The editor loads only when a page is opened.
const WorldEditor = lazy(() => import('./WorldEditor'));

/** One world page: its values for its index's columns, its rich text, and the pages inside it. */
export function WorldPagePage({ pageId }: { pageId: string }) {
  const page = useEntry(pageId);
  const entries = useEntries();
  const byId = useEntryMap(entries.data);
  const trail = page.data ? trailOf(byId, page.data) : [];
  const notebookId = trail[0]?.type === 'notebook' ? trail[0].id : null;
  return (
    <NotebookLayout notebookId={notebookId} currentId={pageId} trail={trail} entries={entries.data}>
      <Breadcrumbs trail={trail} />
      <EntryGate live={page} noun="page">
        {(p) => <WorldPage key={p.id} page={p} entries={entries.data} byId={byId} trail={trail} />}
      </EntryGate>
    </NotebookLayout>
  );
}

function WorldPage({
  page,
  entries,
  byId,
  trail,
}: {
  page: Entry;
  entries: Entry[] | undefined;
  byId: Map<string, Entry>;
  trail: Entry[];
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const body = useBody(page.id);
  const title = useAutosaved(page.title, (v) => updateEntry(ws, page.id, { title: v.trim() }));
  const parent = trail[trail.length - 1];
  const columns = parent?.type === 'index' ? columnsOf(parent) : [];
  const props = propsOf(page);
  const kind = pageKind(byId, page);
  const inside = childrenOf(entries, page.id, 'page');
  const links = useMemo(() => linkables(entries, page.id), [entries, page.id]);

  // What the page links to now, so a save can drop the links it no longer needs.
  const mentionLinks = useLinks({ kind: 'mention', fromId: page.id });
  const linked = useRef<string[]>([]);
  useEffect(() => {
    linked.current = (mentionLinks.data ?? []).map((l) => l.toId);
  }, [mentionLinks.data]);
  const onSave = useCallback(
    ({ doc, mentions }: WorldSave) => {
      saveBody(ws, page.id, doc);
      // Touch the page so "recently updated" notices the writing.
      updateEntry(ws, page.id, {});
      syncMentions(ws, page.id, linked.current, mentions);
      linked.current = mentions;
    },
    [ws, page.id],
  );
  const onOpen = useCallback(
    (id: string) => {
      const target = byId.get(id);
      const route = target && !target.deletedAt && entryRoute(target);
      if (route) void navigate(route);
      else toast('That page isn’t here any more.');
    },
    [byId, navigate],
  );

  const onDelete = () => {
    title.flush();
    const undo = trashAll(ws, treeIds(entries, page.id));
    const route = parent && entryRoute(parent);
    void navigate(route || { to: '/world' });
    toast(
      inside.length
        ? 'Page moved to the trash, with the pages inside it.'
        : 'Page moved to the trash.',
      {
        action: { label: 'Undo', onClick: undo },
      },
    );
  };

  const onAddInside = () => {
    title.flush();
    const id = addSubpage(ws, page);
    void navigate({ to: '/world/pages/$pageId', params: { pageId: id } });
  };

  return (
    <>
      <article className="panel flex flex-col gap-4 border-t-4 border-t-accent">
        <div className="flex flex-col gap-1">
          <span className="label">{kind}</span>
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
                linkables={links}
                onOpen={onOpen}
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

      <section className="flex flex-col gap-2.5" aria-label="Pages inside">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[1.05rem]">Pages inside</h2>
          <button type="button" className="btn btn-small" onClick={onAddInside}>
            + Add a page inside
          </button>
        </div>
        {inside.length === 0 ? (
          <p className="text-[0.88rem] text-muted">
            None yet. Add pages here for the parts of {page.title.trim() || 'this page'}: districts
            of a city, chapters of a history, members of a guild.
          </p>
        ) : (
          <ul className="panel flex flex-col divide-y divide-line !p-0">
            {inside.map((p) => (
              <li key={p.id}>
                <Link
                  to="/world/pages/$pageId"
                  params={{ pageId: p.id }}
                  className="block px-3.5 py-2.5 font-semibold hover:bg-sunken"
                >
                  {p.title.trim() || 'Untitled'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AppearsIn
        entryId={page.id}
        title="Used in Story Forge"
        empty={
          page.template === 'location'
            ? 'Not in any scenes yet. Pick it as a scene’s place on the Writer’s Desk, or type @ and its name while you write.'
            : 'Not in any scenes yet. Type @ and its name while you write a scene on the Writer’s Desk.'
        }
      />
      <LinkedFrom entryId={page.id} byId={byId} />
    </>
  );
}

/** World pages (and anything else but scenes) that @link to this entry. */
export function LinkedFrom({ entryId, byId }: { entryId: string; byId: Map<string, Entry> }) {
  const links = useLinks({ kind: 'mention', toId: entryId });
  const from = (links.data ?? [])
    .map((l) => byId.get(l.fromId))
    // Scenes are listed under "Used in Story Forge".
    .filter((e): e is Entry => !!e && !e.deletedAt && e.type !== 'scene' && !!entryRoute(e))
    .sort(byOrder);
  if (from.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5" aria-label="Linked from">
      <h2 className="text-[1.05rem]">Linked from</h2>
      <ul className="panel flex flex-col divide-y divide-line !p-0">
        {from.map((e) => (
          <li key={e.id} data-sec={ENTRY_SECTION[e.type]}>
            <Link
              {...entryRoute(e)!}
              className="flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-sunken"
            >
              <span className="font-semibold">{e.title.trim() || 'Untitled'}</span>
              <span className="text-[0.78rem] text-accent">
                {e.type === 'page' ? pageKind(byId, e) : entryTypeName(e.type)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
