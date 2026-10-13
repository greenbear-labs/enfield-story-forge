import { Link, useNavigate } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { removedField, restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { addBeat, beatFieldsData, beatsOf, customKey, outlinesUsing } from './customStructures';
import type { Beat } from './structures';

/** Edit one of your own structures: its name, what it suits, and its beats. */
export function StructurePage({ structureId }: { structureId: string }) {
  const structure = useEntry(structureId);
  const ws = useAuthStore((s) => s.workspaceId)!;

  return (
    <div data-sec="story" className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <h1 className="sr-only">{structure.data?.title || 'Structure'}</h1>
      <Link
        to="/outlines"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Outline Builder
      </Link>
      {structure.data === undefined ? (
        structure.error ? (
          <EmptyState>Couldn’t load this structure. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : structure.data === null || structure.data.type !== 'structure' ? (
        <EmptyState>
          This structure doesn’t exist. It may have been deleted on another device.
        </EmptyState>
      ) : structure.data.deletedAt ? (
        <div className="empty-state flex flex-col items-center gap-3">
          <p>This structure is in the trash.</p>
          <button type="button" className="btn" onClick={() => restoreEntry(ws, structureId)}>
            Restore it
          </button>
        </div>
      ) : (
        <StructureEditor key={structure.data.id} structure={structure.data} />
      )}
    </div>
  );
}

function StructureEditor({ structure }: { structure: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const books = useEntries('book');
  const beats = beatsOf(structure);
  const usedBy = outlinesUsing(books.data ?? [], customKey(structure.id));
  const name = useAutosaved(structure.title, (v) =>
    updateEntry(ws, structure.id, { title: v.trim() }),
  );
  const bestFor = useAutosaved(
    typeof structure.fields.bestFor === 'string' ? structure.fields.bestFor : '',
    (v) => updateEntry(ws, structure.id, {}, { bestFor: v.trim() }),
  );

  const remove = () => {
    if (
      usedBy.length > 0 &&
      !window.confirm(
        `${usedBy.length === 1 ? 'An outline uses' : `${usedBy.length} outlines use`} this structure. They’ll show the Hero’s Journey instead until you restore it. Delete it anyway?`,
      )
    )
      return;
    name.flush();
    bestFor.flush();
    trashEntry(ws, structure.id);
    void navigate({ to: '/outlines' });
    toast('Structure deleted.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, structure.id) },
    });
  };

  return (
    <>
      <section className="panel flex flex-col gap-3 border-t-4 border-t-accent">
        <div className="label">Your structure</div>
        <label className="flex flex-col gap-1">
          <span className="sr-only">Structure name</span>
          <input
            className="txt font-display text-[1.5rem] font-semibold"
            placeholder="Name your structure"
            {...name.props}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Best for</span>
          <input
            className="txt"
            placeholder="e.g. Cozy mysteries with two timelines"
            {...bestFor.props}
          />
        </label>
        <Timeline beats={beats} />
        <p className="text-[0.85rem] text-muted">
          {usedBy.length === 0
            ? 'No outline uses it yet. Pick it under Structure on any outline.'
            : `Used by ${usedBy.map((b) => b.title || 'an untitled outline').join(', ')}.`}
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="beats-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="beats-title" className="text-[1.05rem]">
            Beats
          </h2>
          <span className="text-[0.82rem] text-muted">
            Each beat’s place is how far through the story it lands, from 0% to 100%.
          </span>
        </div>
        {beats.length === 0 && <EmptyState>No beats yet. Add the first one below.</EmptyState>}
        <ol className="flex flex-col gap-2.5">
          {beats.map((b, i) => (
            <BeatRow key={b.key} structure={structure} beat={b} n={i + 1} />
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => addBeat(ws, structure, beats[beats.length - 1])}
          >
            <Icon name="plus" size={14} />
            Add a beat
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={remove}>
            <Icon name="trash" size={14} />
            Delete this structure
          </button>
        </div>
      </section>
    </>
  );
}

/** The beats as dots along the story, so gaps and crowding show at a glance. */
function Timeline({ beats }: { beats: Beat[] }) {
  return (
    <div className="flex flex-col gap-1" aria-hidden="true">
      <div className="relative h-3 rounded-full bg-sunken">
        {beats.map((b) => (
          <span
            key={b.key}
            title={`${b.name || 'Untitled beat'} · ${Math.round(b.position * 100)}%`}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent"
            style={{ left: `${b.position * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[0.72rem] text-muted">
        <span>Start</span>
        <span>Middle</span>
        <span>End</span>
      </div>
    </div>
  );
}

function BeatRow({ structure, beat, n }: { structure: Entry; beat: Beat; n: number }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const path = `beats.${beat.key}`;
  const save = (field: string, value: string | number) =>
    updateEntry(ws, structure.id, {}, { [`${path}.${field}`]: value });
  const name = useAutosaved(beat.name, (v) => save('name', v.trim()));
  const part = useAutosaved(beat.part, (v) => save('part', v.trim()));
  const prompt = useAutosaved(beat.prompt, (v) => save('prompt', v.trim()));
  const place = useAutosaved(String(Math.round(beat.position * 100)), (v) => {
    const pct = Number.parseFloat(v);
    if (Number.isFinite(pct)) save('position', Math.min(100, Math.max(0, pct)) / 100);
  });
  const label = name.props.value.trim() || `beat ${n}`;

  const remove = () => {
    for (const f of [name, part, prompt, place]) f.flush();
    const saved = beatFieldsData({
      name: name.props.value.trim(),
      part: part.props.value.trim(),
      prompt: prompt.props.value.trim(),
      position: beat.position,
    });
    updateEntry(ws, structure.id, {}, { [path]: removedField() });
    toast(`Removed ${label}.`, {
      action: {
        label: 'Undo',
        onClick: () => updateEntry(ws, structure.id, {}, { [path]: saved }),
      },
    });
  };

  return (
    <li className="panel flex flex-col gap-2 !py-3">
      <div className="flex flex-wrap items-end gap-2">
        <span className="font-mono text-[0.75rem] font-medium text-accent">{n}</span>
        <label className="flex min-w-[180px] flex-[2] flex-col gap-1">
          <span className="label">Beat</span>
          <input className="txt font-semibold" placeholder="e.g. The Midpoint" {...name.props} />
        </label>
        <label className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className="label">Part</span>
          <input className="txt" placeholder="e.g. Act 2" {...part.props} />
        </label>
        <label className="flex w-[92px] flex-col gap-1">
          <span className="label">Place (%)</span>
          <input
            className="txt"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            {...place.props}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Question for the writer</span>
        <textarea
          className="txt min-h-14"
          placeholder="What should this beat ask of the story?"
          {...prompt.props}
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => addBeat(ws, structure, beat)}
        >
          <Icon name="plus" size={14} />
          Add a beat after
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label={`Remove ${label}`}
          onClick={remove}
        >
          <Icon name="close" size={14} />
          Remove
        </button>
      </div>
    </li>
  );
}
