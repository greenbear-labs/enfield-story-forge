import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry, useLinks } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { InfoLink } from '../appendix/InfoLink';
import { structureByKey } from '../outlines/structures';
import { chapterBeatKeys, childrenOf, move } from './deskModel';
import {
  addPlotline,
  breakdown,
  longestGap,
  MICE_TYPES,
  PLOTLINE_COLORS,
  plotlineColor,
  plotlineMice,
  plotlineNote,
  plotlinesByScene,
  setScenePlotline,
  type BreakdownRow,
} from './plotlineModel';

/** The Chapter Breakdown: every plotline across every chapter, and the plotlines themselves. */
export function BreakdownPage({ bookId }: { bookId: string }) {
  const book = useEntry(bookId);
  return (
    <div data-sec="desk" className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <Link
        to="/desk/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Manuscript
      </Link>
      {book.data === undefined ? (
        book.error ? (
          <EmptyState>Couldn’t load this manuscript. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : !book.data || book.data.deletedAt ? (
        <EmptyState>This manuscript isn’t here. Its outline may be in the trash.</EmptyState>
      ) : (
        <Breakdown book={book.data} />
      )}
    </div>
  );
}

function Breakdown({ book }: { book: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const allChapters = useEntries('chapter');
  const allScenes = useEntries('scene');
  const allPlotlines = useEntries('plotline');
  const links = useLinks({ kind: 'plotline' });
  const chapters = useMemo(
    () => childrenOf(allChapters.data, book.id),
    [allChapters.data, book.id],
  );
  const plotlines = useMemo(
    () => childrenOf(allPlotlines.data, book.id),
    [allPlotlines.data, book.id],
  );
  const tags = useMemo(() => plotlinesByScene(links.data), [links.data]);
  const rows = useMemo(
    () => breakdown(chapters, allScenes.data, plotlines, tags),
    [chapters, allScenes.data, plotlines, tags],
  );
  const [editing, setEditing] = useState<{ plotline: Entry; chapter: number } | null>(null);
  const loading =
    allChapters.data === undefined ||
    allScenes.data === undefined ||
    allPlotlines.data === undefined ||
    links.data === undefined;

  return (
    <>
      <header className="panel flex flex-col gap-2 border-t-4 border-t-accent">
        <span className="label">Chapter Breakdown</span>
        <h1 className="text-[1.8rem] max-sm:text-[1.5rem]">{book.title || 'Untitled story'}</h1>
        <p className="text-[0.9rem] text-muted">
          Every plotline across every chapter. Tag scenes with a plotline here or on the Scene Desk,
          and watch for threads that go quiet for too long.{' '}
          <InfoLink topic="Plotlines and the MICE quotient" label="About plotlines" />
        </p>
      </header>

      {loading ? (
        <Loading />
      ) : chapters.length === 0 ? (
        <EmptyState>No chapters yet. Add them on the manuscript page.</EmptyState>
      ) : (
        <Grid
          book={book}
          chapters={chapters}
          rows={rows}
          onEdit={(plotline, chapter) => setEditing({ plotline, chapter })}
        />
      )}

      <section className="flex flex-col gap-2.5" aria-label="Plotlines">
        <h2 className="text-[1.05rem]">Plotlines</h2>
        {allPlotlines.data === undefined ? (
          <Loading />
        ) : plotlines.length === 0 ? (
          <EmptyState>
            No plotlines yet. Start with the main plot, then add a subplot or two.
          </EmptyState>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {plotlines.map((p, i) => (
              <PlotlineEditor
                key={p.id}
                plotline={p}
                first={i === 0}
                last={i === plotlines.length - 1}
                onMove={(dir) => move(ws, plotlines, p.id, dir)}
              />
            ))}
          </ol>
        )}
        <button
          type="button"
          className="btn self-start"
          onClick={() => addPlotline(ws, book.id, plotlines.length)}
        >
          + Add a plotline
        </button>
      </section>

      {editing && (
        <TagScenesDialog
          plotline={editing.plotline}
          chapter={chapters[editing.chapter]!}
          number={editing.chapter + 1}
          scenes={childrenOf(allScenes.data, chapters[editing.chapter]!.id)}
          tags={tags}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function Grid({
  book,
  chapters,
  rows,
  onEdit,
}: {
  book: Entry;
  chapters: Entry[];
  rows: BreakdownRow[];
  onEdit: (plotline: Entry, chapter: number) => void;
}) {
  const structure = structureByKey(
    typeof chapters[0]?.fields.structure === 'string' ? chapters[0].fields.structure : undefined,
  );
  const beatName = new Map(structure.beats.map((b) => [b.key, b.name]));
  const hasScenes = rows[0] ? chapters.map((_, i) => rows.some((r) => r.cells[i]!.length > 0)) : [];
  const untagged = rows[rows.length - 1]!;

  return (
    <div
      className="panel relative overflow-x-auto !p-0"
      role="region"
      aria-label="Plotlines by chapter"
      tabIndex={0}
    >
      <table className="breakdown">
        <thead>
          <tr>
            <th scope="col" className="breakdown-head">
              <span className="sr-only">Plotline</span>
            </th>
            {chapters.map((c, i) => (
              <th key={c.id} scope="col">
                <Link
                  to="/desk/chapters/$chapterId"
                  params={{ chapterId: c.id }}
                  className="hover:underline"
                  title={c.title}
                >
                  <span className="sr-only">{c.title || `Chapter ${i + 1}`}</span>
                  <span aria-hidden="true">{i + 1}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr data-sec="story">
            <th scope="row" className="breakdown-head">
              <span className="label">Beats</span>
            </th>
            {chapters.map((c) => (
              <td key={c.id} className="text-[0.75rem] text-accent">
                {chapterBeatKeys(c)
                  .map((k) => beatName.get(k))
                  .filter(Boolean)
                  .join(', ')}
              </td>
            ))}
          </tr>
          {rows.slice(0, -1).map((row) => {
            const p = row.plotline!;
            const gap = longestGap(row);
            return (
              <tr key={p.id} data-sec={plotlineColor(p)}>
                <th scope="row" className="breakdown-head">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span
                      className="size-2.5 flex-none rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {p.title || 'Untitled plotline'}
                  </span>
                  <span className="block text-[0.72rem] font-normal text-muted">
                    {row.chapters} of {chapters.length} chapters
                    {gap >= 3 && ` · quiet for ${gap} in a row`}
                  </span>
                </th>
                {row.cells.map((cell, i) => (
                  <td key={chapters[i]!.id}>
                    <div className="flex flex-col items-start gap-1">
                      {cell.map((s) => (
                        <Link
                          key={s.id}
                          to="/desk/scenes/$sceneId"
                          params={{ sceneId: s.id }}
                          className="chip max-w-full truncate hover:underline"
                        >
                          {s.title || 'Untitled scene'}
                        </Link>
                      ))}
                      {hasScenes[i] && (
                        <button
                          type="button"
                          className="breakdown-add"
                          aria-label={`Tag scenes in Chapter ${i + 1} with ${p.title || 'this plotline'}`}
                          onClick={() => onEdit(p, i)}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
          <tr data-sec="home">
            <th scope="row" className="breakdown-head">
              <span className="font-semibold">No plotline</span>
              <span className="block text-[0.72rem] font-normal text-muted">
                Scenes not tagged yet
              </span>
            </th>
            {untagged.cells.map((cell, i) => (
              <td key={chapters[i]!.id}>
                <div className="flex flex-col items-start gap-1">
                  {cell.map((s) => (
                    <Link
                      key={s.id}
                      to="/desk/scenes/$sceneId"
                      params={{ sceneId: s.id }}
                      className="chip max-w-full truncate hover:underline"
                    >
                      {s.title || 'Untitled scene'}
                    </Link>
                  ))}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {rows.length === 1 && (
        <p className="border-t border-line p-3 text-[0.85rem] text-muted">
          Add a plotline below to start filling in {book.title || 'the story'}’s grid.
        </p>
      )}
    </div>
  );
}

function TagScenesDialog({
  plotline,
  number,
  scenes,
  tags,
  onClose,
}: {
  plotline: Entry;
  chapter: Entry;
  number: number;
  scenes: Entry[];
  tags: Map<string, Set<string>>;
  onClose: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  // Kept here so a box flips at once; the live links catch up a moment later.
  const [on, setOn] = useState(
    () => new Set(scenes.filter((s) => tags.get(s.id)?.has(plotline.id)).map((s) => s.id)),
  );
  const toggle = (sceneId: string, checked: boolean) => {
    setOn((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sceneId);
      else next.delete(sceneId);
      return next;
    });
    setScenePlotline(ws, sceneId, plotline.id, checked);
  };
  return (
    <Dialog
      title={`${plotline.title || 'Plotline'} in Chapter ${number}`}
      sec={plotlineColor(plotline)}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[0.9rem] text-muted">Which scenes carry this plotline?</p>
        <ul className="flex flex-col gap-1.5">
          {scenes.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={on.has(s.id)}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                />
                {s.title || 'Untitled scene'}
              </label>
            </li>
          ))}
        </ul>
        <div>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function PlotlineEditor({
  plotline,
  first,
  last,
  onMove,
}: {
  plotline: Entry;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const title = useAutosaved(plotline.title, (v) =>
    updateEntry(ws, plotline.id, { title: v.trim() || 'Untitled plotline' }),
  );
  const note = useAutosaved(plotlineNote(plotline), (v) =>
    updateEntry(ws, plotline.id, {}, { note: v.trim() }),
  );
  const color = plotlineColor(plotline);
  const mice = plotlineMice(plotline);
  const name = plotline.title || 'Untitled plotline';

  const onDelete = () => {
    title.flush();
    note.flush();
    trashEntry(ws, plotline.id);
    toast('Plotline moved to the trash. Its scenes stay where they are.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, plotline.id) },
    });
  };

  return (
    <li data-sec={color} className="panel flex flex-col gap-3 border-l-4 border-l-accent">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Plotline name</span>
          <input
            className="w-full border-0 bg-transparent p-0 font-display text-[1.1rem] font-semibold outline-none"
            {...title.props}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={`Move ${name} up`}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={`Move ${name} down`}
          disabled={last}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="label">Color</span>
          <div role="radiogroup" aria-label={`${name} color`} className="flex flex-wrap gap-1.5">
            {PLOTLINE_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={color === c.key}
                aria-label={c.label}
                title={c.label}
                data-sec={c.key}
                className={`size-6 rounded-full bg-accent ${
                  color === c.key ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
                }`}
                onClick={() => updateEntry(ws, plotline.id, {}, { color: c.key })}
              />
            ))}
          </div>
        </div>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="label">Kind of thread (MICE)</span>
          <select
            className="txt"
            value={mice?.key ?? ''}
            onChange={(e) => updateEntry(ws, plotline.id, {}, { mice: e.target.value })}
          >
            <option value="">Not chosen</option>
            {MICE_TYPES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {mice && <p className="text-[0.82rem] text-muted">{mice.hint}</p>}
      <label className="flex flex-col gap-1">
        <span className="label">What this thread is about</span>
        <textarea
          className="txt field-sizing-content min-h-12"
          placeholder="e.g. Mira learns who sent the letter."
          {...note.props}
        />
      </label>
      <div className="flex border-t border-line pt-3">
        <button type="button" className="btn btn-ghost btn-small ml-auto" onClick={onDelete}>
          <Icon name="trash" size={14} />
          Delete plotline
        </button>
      </div>
    </li>
  );
}
