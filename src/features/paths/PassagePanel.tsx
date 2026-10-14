import { Link } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, saveBody, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useBody, useEntries, useLinks } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { syncMentions } from '../desk/deskModel';
import { EntryGallery } from '../images/EntryGallery';
import type { WorldSave } from '../world/WorldEditor';
import { linkables } from '../world/worldModel';
import {
  MAX_COST,
  addChoice,
  choicesInto,
  choicesOf,
  createPassage,
  ENDING_TYPES,
  endingOf,
  moveChoice,
  passageName,
  passageNotes,
  freeSpot,
  posOf,
  removeChoice,
  setEnding,
  setStart,
  updateChoice,
  type Choice,
  type EndingType,
} from './pathsModel';

import { ChoiceRules, PassageLines } from './StateEditor';
import { storyVars, type StoryVar } from './stateModel';

// The rich text editor loads only when a passage is opened.
const WorldEditor = lazy(() => import('../world/WorldEditor'));

const NEW_PASSAGE = '__new__';

/** Everything about one passage: its words, its choices, and whether it ends the story. */
export function PassagePanel({
  adventure,
  passage,
  passages,
  startId,
  onSelect,
}: {
  adventure: Entry;
  passage: Entry;
  passages: Entry[];
  startId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const entries = useEntries();
  const body = useBody(passage.id);
  const title = useAutosaved(passage.title, (v) =>
    updateEntry(ws, passage.id, { title: v.trim() }),
  );
  const notes = useAutosaved(passageNotes(passage), (v) =>
    updateEntry(ws, passage.id, {}, { notes: v.trim() }),
  );
  const ending = endingOf(passage);
  const choices = choicesOf(passage);
  const into = choicesInto(passages, passage.id);
  const isStart = passage.id === startId;
  const links = useMemo(() => linkables(entries.data, passage.id), [entries.data, passage.id]);

  // What the passage @mentions now, so a save can drop the links it no longer needs.
  const mentionLinks = useLinks({ kind: 'mention', fromId: passage.id });
  const linked = useRef<string[]>([]);
  useEffect(() => {
    linked.current = (mentionLinks.data ?? []).map((l) => l.toId);
  }, [mentionLinks.data]);
  const onSave = useCallback(
    ({ doc, mentions }: WorldSave) => {
      saveBody(ws, passage.id, doc);
      updateEntry(ws, passage.id, {});
      syncMentions(ws, passage.id, linked.current, mentions);
      linked.current = mentions;
    },
    [ws, passage.id],
  );

  const onDelete = () => {
    title.flush();
    notes.flush();
    trashEntry(ws, passage.id);
    onSelect(null);
    toast('Passage moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, passage.id) },
    });
  };

  const others = passages.filter((p) => p.id !== passage.id);
  const vars = storyVars(adventure);

  return (
    <aside
      className="panel sp-panel flex flex-col gap-4"
      aria-label={`Passage: ${passageName(passage)}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="label text-accent">
            {isStart ? 'Passage · the start' : ending ? 'Ending' : 'Passage'}
          </span>
          <label>
            <span className="sr-only">Passage name</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.5rem] outline-none"
              placeholder="Name this passage"
              autoFocus={!passage.title}
              {...title.props}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Close the passage"
          onClick={() => onSelect(null)}
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 items-center gap-2">
          <span className="label flex-none">This is</span>
          <select
            className="txt w-auto min-w-0 py-1"
            value={ending ?? ''}
            onChange={(e) =>
              setEnding(ws, passage.id, (e.target.value || null) as EndingType | null)
            }
          >
            <option value="">A passage</option>
            {ENDING_TYPES.map((t) => (
              <option key={t.key} value={t.key} title={t.blurb}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {!isStart && (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setStart(ws, adventure.id, passage.id)}
          >
            Start the story here
          </button>
        )}
        <Link
          to="/paths/$adventureId/play"
          params={{ adventureId: adventure.id }}
          search={{ from: passage.id }}
          className="btn btn-small"
        >
          Play from here
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="label">What the reader sees</span>
        {body.data === undefined ? (
          body.error ? (
            <EmptyState>Couldn’t load this passage. Check your connection and reload.</EmptyState>
          ) : (
            <Loading />
          )
        ) : (
          <div className="rounded-md border border-line bg-sunken px-3 py-2">
            <Suspense fallback={<Loading />}>
              <WorldEditor
                key={passage.id}
                initial={body.data?.doc ?? null}
                onSave={onSave}
                label={`${passageName(passage)}: the passage`}
                linkables={links}
                onOpen={() =>
                  toast('Open characters and places from Story Forge or World Creator.')
                }
              />
            </Suspense>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-2" aria-label="Choices">
        <span className="label">
          {ending ? 'Choices (an ending can still offer “try again”)' : 'Choices'}
        </span>
        {choices.length === 0 && !ending && (
          <p className="text-[0.85rem] text-muted">
            No choices yet, so the reader is stuck here. Add one, or make this an ending.
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {choices.map((c, i) => (
            <ChoiceRow
              key={c.id}
              passage={passage}
              choice={c}
              others={others}
              vars={vars}
              first={i === 0}
              last={i === choices.length - 1}
              onNewPassage={() => {
                const at = posOf(passage);
                const id = createPassage(
                  ws,
                  adventure,
                  freeSpot(passages, { x: at.x + 300, y: at.y + i * 140 }),
                );
                updateChoice(ws, passage.id, c.id, { to: id });
                onSelect(id);
              }}
            />
          ))}
        </ol>
        <button
          type="button"
          className="btn btn-small self-start"
          onClick={() => addChoice(ws, passage, null)}
        >
          + Add a choice
        </button>
      </section>

      <PassageLines passage={passage} vars={vars} />

      {into.length > 0 && (
        <section className="flex flex-col gap-1" aria-label="Leads here">
          <span className="label">Readers arrive from</span>
          <ul className="flex flex-wrap gap-1.5">
            {into.map(({ from, choice }) => (
              <li key={`${from.id}:${choice.id}`}>
                <button type="button" className="seg" onClick={() => onSelect(from.id)}>
                  {passageName(from)}
                  {choice.label.trim() && (
                    <span className="text-muted"> · “{choice.label.trim()}”</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <EntryGallery entry={passage} label="Pictures" />

      <label className="flex flex-col gap-1">
        <span className="label">Private notes (readers never see these)</span>
        <textarea className="txt" rows={2} {...notes.props} />
      </label>

      <div className="flex justify-end border-t border-line pt-3">
        <button type="button" className="btn btn-ghost btn-small" onClick={onDelete}>
          <Icon name="trash" size={14} />
          Delete passage
        </button>
      </div>
    </aside>
  );
}

function ChoiceRow({
  passage,
  choice,
  others,
  vars,
  first,
  last,
  onNewPassage,
}: {
  passage: Entry;
  choice: Choice;
  others: Entry[];
  vars: StoryVar[];
  first: boolean;
  last: boolean;
  onNewPassage: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const label = useAutosaved(choice.label, (v) =>
    updateChoice(ws, passage.id, choice.id, { label: v.trim() }),
  );
  // A choice that leads to a deleted passage reads as undecided.
  const to = choice.to && others.some((p) => p.id === choice.to) ? choice.to : '';

  return (
    <li className="flex flex-col gap-1.5 rounded-md border border-line bg-sunken p-2">
      <div className="flex items-center gap-1">
        <input
          className="txt flex-1"
          placeholder="What the reader chooses, e.g. Follow the lantern"
          aria-label="Choice text"
          {...label.props}
        />
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Move up"
          disabled={first}
          onClick={() => moveChoice(ws, passage, choice.id, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Move down"
          disabled={last}
          onClick={() => moveChoice(ws, passage, choice.id, 1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Remove choice"
          onClick={() => removeChoice(ws, passage.id, choice.id)}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <label className="flex items-center gap-2 text-[0.85rem]">
        <span className="text-muted">Leads to</span>
        <select
          className="txt flex-1 py-1"
          value={to}
          onChange={(e) => {
            if (e.target.value === NEW_PASSAGE) onNewPassage();
            else updateChoice(ws, passage.id, choice.id, { to: e.target.value || null });
          }}
        >
          <option value="">Not decided yet</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {passageName(p)}
              {endingOf(p) ? ' (ending)' : ''}
            </option>
          ))}
          <option value={NEW_PASSAGE}>+ A new passage</option>
        </select>
      </label>
      <label className="flex flex-wrap items-center gap-2 text-[0.85rem]">
        <span className="text-muted">Gems to unlock</span>
        <input
          type="number"
          min={0}
          max={MAX_COST}
          className="txt w-[72px] py-1"
          value={choice.cost}
          onChange={(e) =>
            updateChoice(ws, passage.id, choice.id, {
              cost: Math.max(0, Math.round(Number(e.target.value)) || 0),
            })
          }
        />
        <span className="text-muted">
          {choice.cost ? 'Readers pay once, then it stays open' : 'Free'}
        </span>
      </label>
      <ChoiceRules passage={passage} choice={choice} vars={vars} />
    </li>
  );
}
