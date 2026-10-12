import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { Menu } from '../../components/ui/Menu';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry, useEntryMap } from '../../lib/entries/hooks';
import { matchesQuery } from '../../lib/entries/model';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { cardGrid } from '../shards/ShardCard';
import { ColumnDialog } from './ColumnDialog';
import { PropField } from './PropField';
import { Breadcrumbs, EntryGate, NotebookLayout } from './WorldFrame';
import {
  INDEX_VIEWS,
  addColumn,
  addPage,
  chipsOf,
  columnsOf,
  indexView,
  itemName,
  moveColumn,
  propsOf,
  removeColumn,
  restoreColumn,
  sortPages,
  summaryOf,
  trailOf,
  trashAll,
  treeIds,
  updateColumn,
  type PageSort,
  type WorldColumn,
} from './worldModel';

/** An index: its pages as a table, a gallery, or a list. */
export function IndexPage({ indexId }: { indexId: string }) {
  const index = useEntry(indexId);
  const entries = useEntries();
  const byId = useEntryMap(entries.data);
  const trail = index.data ? trailOf(byId, index.data) : [];
  return (
    <NotebookLayout
      notebookId={index.data?.parentId ?? null}
      currentId={indexId}
      trail={trail}
      entries={entries.data}
    >
      <Breadcrumbs trail={trail} />
      <EntryGate live={index} noun="index">
        {(i) => <Index key={i.id} index={i} />}
      </EntryGate>
    </NotebookLayout>
  );
}

function Index({ index }: { index: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const entries = useEntries();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PageSort>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [columnDialog, setColumnDialog] = useState<WorldColumn | 'new' | null>(null);
  const title = useAutosaved(index.title, (v) =>
    updateEntry(ws, index.id, { title: v.trim() || 'Untitled index' }),
  );
  const view = indexView(index);
  const item = itemName(index);
  const columns = columnsOf(index);

  const all = useMemo(
    () => (entries.data ?? []).filter((p) => p.type === 'page' && p.parentId === index.id),
    [entries.data, index.id],
  );
  const pages = useMemo(
    () =>
      sortPages(
        all.filter((p) => matchesQuery(p, query)),
        sort,
        columns,
      ),
    // `columns` is rebuilt every render; the index's fields are what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, query, sort, index.fields],
  );

  const onNew = () => {
    const id = addPage(ws, index);
    if (view === 'table') setFocusId(id);
    else void navigate({ to: '/world/pages/$pageId', params: { pageId: id } });
  };

  const onDelete = () => {
    title.flush();
    const undo = trashAll(ws, treeIds(entries.data, index.id));
    if (index.parentId)
      void navigate({ to: '/world/$notebookId', params: { notebookId: index.parentId } });
    else void navigate({ to: '/world' });
    toast('Index moved to the trash, with its pages.', {
      action: { label: 'Undo', onClick: undo },
    });
  };

  const onRemoveColumn = (column: WorldColumn) => {
    removeColumn(ws, index.id, column.id);
    toast(`Column “${column.name}” removed.`, {
      action: { label: 'Undo', onClick: () => restoreColumn(ws, index.id, column) },
    });
  };

  return (
    <>
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="text-[1.6rem]">
          {index.icon ?? '📄'}
        </span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Index name</span>
          <input
            className="w-full border-0 bg-transparent p-0 font-display text-[1.7rem] font-semibold outline-none max-sm:text-[1.4rem]"
            {...title.props}
          />
        </label>
        <Menu
          label="Index"
          align="right"
          trigger={(props) => (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label="Index options"
              {...props}
            >
              <Icon name="more" />
            </button>
          )}
        >
          {(close) => (
            <>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  close();
                  setColumnDialog('new');
                }}
              >
                <Icon name="plus" size={16} />
                Add a column
              </button>
              <button type="button" role="menuitem" className="menu-item" onClick={onDelete}>
                <Icon name="trash" size={16} />
                Delete index
              </button>
            </>
          )}
        </Menu>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="View" className="flex gap-1.5">
          {INDEX_VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className="seg"
              aria-pressed={view === v.key}
              onClick={() => updateEntry(ws, index.id, {}, { view: v.key })}
            >
              {v.label}
            </button>
          ))}
        </div>
        <label className="relative flex min-w-[160px] flex-1 items-center">
          <span className="sr-only">Search this index</span>
          <Icon name="search" className="pointer-events-none absolute left-2.5 text-muted" />
          <input
            type="search"
            className="txt pl-8"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          + New {item}
        </button>
      </div>

      {entries.error ? (
        <EmptyState>Couldn’t load this index. Check your connection and reload.</EmptyState>
      ) : entries.data === undefined ? (
        <Loading />
      ) : all.length === 0 && view !== 'table' ? (
        <EmptyState>Nothing here yet. Add your first {item}.</EmptyState>
      ) : pages.length === 0 && query ? (
        <EmptyState>Nothing matches.</EmptyState>
      ) : view === 'table' ? (
        <IndexTable
          index={index}
          pages={pages}
          columns={columns}
          sort={sort}
          setSort={setSort}
          focusId={focusId}
          onNew={onNew}
          onEditColumn={setColumnDialog}
          onRemoveColumn={onRemoveColumn}
        />
      ) : view === 'gallery' ? (
        <div className={cardGrid}>
          {pages.map((p) => (
            <PageCard key={p.id} page={p} columns={columns} />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-md border border-line bg-surface">
          {pages.map((p) => (
            <li key={p.id}>
              <PageRow page={p} columns={columns} />
            </li>
          ))}
        </ul>
      )}

      {columnDialog && (
        <ColumnDialog
          column={columnDialog === 'new' ? undefined : columnDialog}
          onClose={() => setColumnDialog(null)}
          onSave={(draft) =>
            columnDialog === 'new'
              ? addColumn(ws, index, draft)
              : updateColumn(ws, index.id, columnDialog.id, {
                  name: draft.name,
                  ...(columnDialog.type === 'choice' ? { options: draft.options } : {}),
                })
          }
        />
      )}
    </>
  );
}

const untitled = (page: Entry) => page.title.trim() || 'Untitled';

function PageCard({ page, columns }: { page: Entry; columns: WorldColumn[] }) {
  const summary = summaryOf(page, columns);
  const chips = chipsOf(page, columns);
  return (
    <Link to="/world/pages/$pageId" params={{ pageId: page.id }} className="entry-card">
      <b className="font-display text-[1.05rem]">{untitled(page)}</b>
      {summary && <p className="body text-[0.9rem]">{summary}</p>}
      {chips.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}

function PageRow({ page, columns }: { page: Entry; columns: WorldColumn[] }) {
  const summary = summaryOf(page, columns);
  const chips = chipsOf(page, columns);
  return (
    <Link
      to="/world/pages/$pageId"
      params={{ pageId: page.id }}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-sunken"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <b>{untitled(page)}</b>
        {summary && <span className="truncate text-[0.85rem] text-muted">{summary}</span>}
      </span>
      {chips.length > 0 && (
        <span className="flex flex-none flex-wrap justify-end gap-1 max-sm:hidden">
          {chips.slice(0, 3).map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}

const nextSort = (sort: PageSort, by: string): PageSort =>
  sort?.by !== by ? { by, dir: 'asc' } : sort.dir === 'asc' ? { by, dir: 'desc' } : null;

const sortMark = (sort: PageSort, by: string) =>
  sort?.by === by ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';

function IndexTable({
  index,
  pages,
  columns,
  sort,
  setSort,
  focusId,
  onNew,
  onEditColumn,
  onRemoveColumn,
}: {
  index: Entry;
  pages: Entry[];
  columns: WorldColumn[];
  sort: PageSort;
  setSort: (s: PageSort) => void;
  focusId: string | null;
  onNew: () => void;
  onEditColumn: (c: WorldColumn | 'new') => void;
  onRemoveColumn: (c: WorldColumn) => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  return (
    <div className="relative overflow-x-auto rounded-md border border-line bg-surface">
      <table className="world-table">
        <thead>
          <tr>
            <th scope="col" className="min-w-[200px]">
              <button
                type="button"
                className="col-head"
                onClick={() => setSort(nextSort(sort, 'title'))}
              >
                Name{sortMark(sort, 'title')}
              </button>
            </th>
            {columns.map((c, i) => (
              <th key={c.id} scope="col" className={c.type === 'check' ? '' : 'min-w-[150px]'}>
                <Menu
                  label={`Column ${c.name}`}
                  trigger={(props) => (
                    <button type="button" className="col-head" {...props}>
                      {c.name || 'Untitled'}
                      {sortMark(sort, c.id)}
                    </button>
                  )}
                >
                  {(close) => {
                    const item = (label: string, act: () => void, disabled = false) => (
                      <button
                        type="button"
                        role="menuitem"
                        className="menu-item"
                        disabled={disabled}
                        onClick={() => {
                          close();
                          act();
                        }}
                      >
                        {label}
                      </button>
                    );
                    return (
                      <>
                        {item('Sort A to Z', () => setSort({ by: c.id, dir: 'asc' }))}
                        {item('Sort Z to A', () => setSort({ by: c.id, dir: 'desc' }))}
                        {item(c.type === 'choice' ? 'Rename or edit choices' : 'Rename', () =>
                          onEditColumn(c),
                        )}
                        {item('Move left', () => moveColumn(ws, index, c.id, -1), i === 0)}
                        {item(
                          'Move right',
                          () => moveColumn(ws, index, c.id, 1),
                          i === columns.length - 1,
                        )}
                        {item('Remove column', () => onRemoveColumn(c))}
                      </>
                    );
                  }}
                </Menu>
              </th>
            ))}
            <th scope="col" className="w-full">
              <button
                type="button"
                className="col-head text-muted"
                aria-label="Add a column"
                onClick={() => onEditColumn('new')}
              >
                <Icon name="plus" size={14} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                <TitleCell page={p} autoFocus={p.id === focusId} />
              </th>
              {columns.map((c) => (
                <td key={c.id}>
                  <PropField
                    pageId={p.id}
                    column={c}
                    value={propsOf(p)[c.id]}
                    label={`${c.name} of ${untitled(p)}`}
                    compact
                  />
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="world-table-add" onClick={onNew}>
        + New {itemName(index)}
      </button>
    </div>
  );
}

function TitleCell({ page, autoFocus }: { page: Entry; autoFocus: boolean }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const title = useAutosaved(page.title, (v) => updateEntry(ws, page.id, { title: v.trim() }));
  return (
    <span className="flex items-center gap-1">
      <input
        className="cell-input font-semibold"
        aria-label="Name"
        placeholder="Untitled"
        autoFocus={autoFocus}
        {...title.props}
      />
      <Link
        to="/world/pages/$pageId"
        params={{ pageId: page.id }}
        className="flex-none rounded p-1 text-muted hover:bg-sunken hover:text-accent"
        aria-label={`Open ${untitled(page)}`}
        onClick={title.flush}
      >
        <Icon name="arrowRight" size={14} />
      </Link>
    </span>
  );
}
