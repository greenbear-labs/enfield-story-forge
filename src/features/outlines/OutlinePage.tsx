import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { filterCast } from '../characters/characterModel';
import {
  beatNote,
  beatPath,
  beatsFilled,
  FORMATS,
  outlineFormat,
  outlineMethod,
  outlineStructure,
  protagonistId,
  spineFor,
  spinePath,
  spineText,
  START_METHODS,
  type SpineSlot,
} from './outlineModel';
import { STRUCTURES, type Beat, type Structure } from './structures';

export function OutlinePage({ outlineId }: { outlineId: string }) {
  const outline = useEntry(outlineId);
  const ws = useAuthStore((s) => s.workspaceId)!;

  return (
    <div data-sec="story" className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Link
        to="/outlines"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Outline Builder
      </Link>
      {outline.data === undefined ? (
        outline.error ? (
          <EmptyState>Couldn’t load this outline. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : outline.data === null ? (
        <EmptyState>
          This outline doesn’t exist. It may have been deleted on another device.
        </EmptyState>
      ) : outline.data.deletedAt ? (
        <div className="empty-state flex flex-col items-center gap-3">
          <p>This outline is in the trash.</p>
          <button type="button" className="btn" onClick={() => restoreEntry(ws, outlineId)}>
            Restore it
          </button>
        </div>
      ) : (
        <OutlineEditor key={outline.data.id} outline={outline.data} />
      )}
    </div>
  );
}

function OutlineEditor({ outline }: { outline: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const { hash } = useLocation();
  const title = useAutosaved(outline.title, (v) =>
    updateEntry(ws, outline.id, { title: v.trim() || 'Untitled story' }),
  );
  const series = useEntries('series');
  const seriesList = useMemo(
    () => [...(series.data ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [series.data],
  );
  const structure = outlineStructure(outline);

  // The Story Spine and Beat Board tools link straight to their section.
  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const onDelete = () => {
    title.flush();
    trashEntry(ws, outline.id);
    void navigate({ to: '/outlines' });
    toast('Outline moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, outline.id) },
    });
  };

  return (
    <>
      <article className="panel flex flex-col gap-4 border-t-4 border-t-accent">
        <div className="flex flex-col gap-1">
          <span className="label">Outline</span>
          <label>
            <span className="sr-only">Working title</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.8rem] font-semibold outline-none max-sm:text-[1.5rem]"
              {...title.props}
            />
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label">Format</span>
          <div role="group" aria-label="Format" className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="seg"
                aria-pressed={outlineFormat(outline) === f.key}
                onClick={() => updateEntry(ws, outline.id, {}, { format: f.key })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="flex flex-col gap-1">
            <span className="label">Structure</span>
            <select
              className="txt"
              value={structure.key}
              onChange={(e) => {
                updateEntry(ws, outline.id, {}, { structure: e.target.value });
                toast('Structure switched. Your notes for the old one are kept.');
              }}
            >
              {STRUCTURES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Series</span>
            <select
              className="txt"
              value={outline.parentId ?? ''}
              onChange={(e) => updateEntry(ws, outline.id, { parentId: e.target.value || null })}
            >
              <option value="">Standalone (no series)</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || 'Untitled series'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FromConcept outlineId={outline.id} />
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            data-sec="desk"
            className="btn text-accent"
            onClick={() => toast('Sending outlines to the Writer’s Desk arrives with the Desk.')}
          >
            Send to Writer’s Desk →
          </button>
          <button
            type="button"
            className="btn btn-ai"
            onClick={() => toast('AI help arrives in a later version.')}
          >
            Suggest beats with AI
          </button>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onDelete}>
            <Icon name="trash" size={16} />
            Delete
          </button>
        </div>
      </article>

      <nav aria-label="On this page" className="flex flex-wrap gap-1.5">
        <a href="#spine" className="seg">
          Story Spine
        </a>
        <a href="#beats" className="seg">
          Beat Board
        </a>
      </nav>

      <StorySpine outline={outline} />
      <BeatBoard key={structure.key} outline={outline} structure={structure} />
    </>
  );
}

/** The concept this outline grew from, if any. */
function FromConcept({ outlineId }: { outlineId: string }) {
  const links = useLinks({ kind: 'source', fromId: outlineId });
  const concepts = useEntries('concept');
  const byId = useEntryMap(concepts.data);
  const sources = (links.data ?? []).flatMap((l) => byId.get(l.toId) ?? []);
  if (sources.length === 0) return null;
  return (
    <div data-sec="concept" className="flex flex-wrap items-center gap-2">
      <span className="label">From the concept</span>
      {sources.map((c) => (
        <Link
          key={c.id}
          to="/concepts/$conceptId"
          params={{ conceptId: c.id }}
          className="chip hover:underline"
        >
          {c.title || 'Untitled concept'}
        </Link>
      ))}
    </div>
  );
}

function StorySpine({ outline }: { outline: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const method = outlineMethod(outline);
  const slots = spineFor(method);
  const filled = slots.filter((s) => spineText(outline, s.key).trim()).length;
  const characters = useEntries('character');
  const cast = useMemo(() => filterCast(characters.data ?? [], ''), [characters.data]);
  const hero = protagonistId(outline);

  return (
    <section id="spine" className="flex scroll-mt-28 flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[1.05rem]">Story Spine</h2>
        <span className="chip">
          {filled} of {slots.length}
        </span>
      </div>
      <p className="-mt-1.5 text-[0.85rem] text-muted">
        {method === 'theme'
          ? 'The theme-first, ending-first guide: answer in this order, then fill the rest.'
          : `Numbered in the order “${START_METHODS.find((m) => m.key === method)!.label}” walks it. Fill it in any order.`}
      </p>
      <div className="panel flex flex-col gap-3">
        <div data-sec="char" className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="label">Protagonist</span>
            <select
              className="txt"
              value={hero ?? ''}
              onChange={(e) => updateEntry(ws, outline.id, {}, { protagonistId: e.target.value })}
            >
              <option value="">No one yet</option>
              {cast.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || 'Unnamed character'}
                </option>
              ))}
            </select>
          </label>
          {hero && (
            <Link
              to="/characters/$characterId"
              params={{ characterId: hero }}
              className="btn btn-small text-accent"
            >
              Open their card
            </Link>
          )}
        </div>
        <ol className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {slots.map((slot, i) => (
            <SpineField key={slot.key} outline={outline} slot={slot} n={i + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function SpineField({ outline, slot, n }: { outline: Entry; slot: SpineSlot; n: number }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const field = useAutosaved(spineText(outline, slot.key), (v) =>
    updateEntry(ws, outline.id, {}, { [spinePath(slot.key)]: v.trim() }),
  );
  return (
    <li className="flex flex-col gap-1">
      <label className="flex flex-col gap-1">
        <span className="label">
          <span className="mr-1.5 font-mono text-accent">{n}</span>
          {slot.label}
        </span>
        <textarea
          className="txt field-sizing-content min-h-16"
          placeholder={slot.prompt}
          {...field.props}
        />
      </label>
    </li>
  );
}

function BeatBoard({ outline, structure }: { outline: Entry; structure: Structure }) {
  const { filled, total } = beatsFilled(outline);
  const parts = useMemo(() => {
    const out: { part: string; beats: Beat[] }[] = [];
    for (const b of structure.beats) {
      const last = out[out.length - 1];
      if (last?.part === b.part) last.beats.push(b);
      else out.push({ part: b.part, beats: [b] });
    }
    return out;
  }, [structure]);

  return (
    <section id="beats" className="flex scroll-mt-28 flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[1.05rem]">Beat Board</h2>
        <span className="chip">
          {filled} of {total}
        </span>
      </div>
      <p className="-mt-1.5 text-[0.85rem] text-muted">
        {structure.name}, from {structure.origin}. Each beat shows roughly how far through the story
        it lands.
      </p>
      {parts.map((p) => (
        <div key={p.part} className="flex flex-col gap-2">
          <h3 className="label">{p.part}</h3>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {p.beats.map((b) => (
              <BeatCard key={b.key} outline={outline} structure={structure} beat={b} />
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

function BeatCard({
  outline,
  structure,
  beat,
}: {
  outline: Entry;
  structure: Structure;
  beat: Beat;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const field = useAutosaved(beatNote(outline, structure.key, beat.key), (v) =>
    updateEntry(ws, outline.id, {}, { [beatPath(structure.key, beat.key)]: v.trim() }),
  );
  return (
    <li className="panel flex flex-col gap-1.5 !p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-display text-[1rem] font-semibold">{beat.name}</h4>
        <span className="font-mono text-[0.72rem] text-muted" title="How far through the story">
          {Math.round(beat.position * 100)}%
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[0.82rem] text-muted">{beat.prompt}</span>
        <textarea
          className="txt field-sizing-content min-h-20 text-[0.92rem]"
          placeholder="What happens here…"
          {...field.props}
        />
      </label>
    </li>
  );
}
