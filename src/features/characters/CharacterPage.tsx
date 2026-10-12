import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import {
  addLink,
  removedField,
  removeLink,
  restoreEntry,
  trashEntry,
  updateEntry,
} from '../../lib/entries/entries';
import { useEntries, useEntry, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { InfoLink } from '../appendix/InfoLink';
import { useAuthStore } from '../auth/authStore';
import { ShardCard, cardGrid } from '../shards/ShardCard';
import {
  ARC_TYPES,
  CHARACTER_MODULES,
  CORE_FIELDS,
  INTERVIEW_ONLY,
  characterNotes,
  fieldText,
  filledCount,
  relationNotes,
  type FieldDef,
} from './characterModel';
import { AppearsIn } from '../desk/AppearsIn';
import { RoleInput } from './RoleInput';

export function CharacterPage({ characterId }: { characterId: string }) {
  const character = useEntry(characterId);
  const ws = useAuthStore((s) => s.workspaceId)!;

  return (
    <div data-sec="char" className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <Link
        to="/characters"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Character Center
      </Link>
      {character.data === undefined ? (
        character.error ? (
          <EmptyState>Couldn’t load this character. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : character.data === null ? (
        <EmptyState>
          This character doesn’t exist. They may have been deleted on another device.
        </EmptyState>
      ) : character.data.deletedAt ? (
        <div className="empty-state flex flex-col items-center gap-3">
          <p>This character is in the trash.</p>
          <button type="button" className="btn" onClick={() => restoreEntry(ws, characterId)}>
            Restore them
          </button>
        </div>
      ) : (
        <CharacterEditor key={character.data.id} character={character.data} />
      )}
    </div>
  );
}

/** One autosaved field on the card. `path` is where it lives in `fields`. */
function CardField({ character, def }: { character: Entry; def: FieldDef }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const field = useAutosaved(fieldText(character, def.path), (v) =>
    updateEntry(ws, character.id, {}, { [def.path]: v.trim() }),
  );
  return (
    <label className={`flex flex-col gap-1 ${def.long ? 'sm:col-span-2' : ''}`}>
      <span className="label">{def.label}</span>
      {def.path === 'role' ? (
        <RoleInput {...field.props} />
      ) : def.long ? (
        <textarea className="txt min-h-28" placeholder={def.placeholder} {...field.props} />
      ) : (
        <input className="txt" placeholder={def.placeholder} {...field.props} />
      )}
    </label>
  );
}

function CharacterEditor({ character }: { character: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const name = useAutosaved(character.title, (v) =>
    updateEntry(ws, character.id, { title: v.trim() || 'Unnamed character' }),
  );
  const notes = useAutosaved(characterNotes(character), (v) =>
    updateEntry(ws, character.id, {}, { notes: v }),
  );

  const onDelete = () => {
    name.flush();
    notes.flush();
    trashEntry(ws, character.id);
    void navigate({ to: '/characters' });
    toast('Character moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, character.id) },
    });
  };

  return (
    <>
      <article className="panel flex flex-col gap-4 border-t-4 border-t-accent">
        <div className="flex flex-col gap-1">
          <span className="label">Character</span>
          <label>
            <span className="sr-only">Character name</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.8rem] font-semibold outline-none max-sm:text-[1.5rem]"
              {...name.props}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {CORE_FIELDS.map((def) => (
            <CardField key={def.path} character={character} def={def} />
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Notes</span>
          <textarea
            className="txt min-h-24"
            placeholder="Anything else about them, in any order."
            {...notes.props}
          />
        </label>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Link to="/characters/interview" search={{ character: character.id }} className="btn">
            <Icon name="chat" size={16} />
            Interview them
          </Link>
          <Link
            to="/outlines/new"
            search={{ character: character.id }}
            data-sec="story"
            className="btn text-accent"
          >
            Start an outline →
          </Link>
          <button
            type="button"
            className="btn btn-ai"
            onClick={() => toast('AI help arrives in a later version.')}
          >
            Deepen with AI
          </button>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onDelete}>
            <Icon name="trash" size={16} />
            Delete
          </button>
        </div>
      </article>

      <section className="flex flex-col gap-2.5" aria-label="Modules">
        <h2 className="text-[1.05rem]">Modules</h2>
        <p className="-mt-1.5 text-[0.85rem] text-muted">
          Open one when you need more depth. Empty ones stay out of the way.
        </p>
        {CHARACTER_MODULES.map((m) => (
          <Module
            key={m.key}
            title={m.title}
            blurb={m.blurb}
            count={`${filledCount(character, m.fields)} of ${m.fields.length}`}
          >
            {m.key === 'arc' && <ArcType character={character} />}
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {m.fields.map((def) => (
                <CardField key={def.path} character={character} def={def} />
              ))}
            </div>
          </Module>
        ))}
        <Relationships character={character} />
        <Module
          title="Interview answers"
          blurb="Answers from the Character Interview that don’t belong on the card."
          count={`${filledCount(character, INTERVIEW_ONLY)} of ${INTERVIEW_ONLY.length}`}
        >
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {INTERVIEW_ONLY.map((q) => (
              <CardField
                key={q.path}
                character={character}
                def={{ path: q.path, label: q.label!, placeholder: q.question }}
              />
            ))}
          </div>
        </Module>
        <Module title="Images" blurb="A gallery of looks, sketches, and references." count="Soon">
          <p className="text-[0.9rem] text-muted">
            Image galleries arrive once photo storage is switched on for Story Forge.
          </p>
        </Module>
      </section>

      <AppearsIn entryId={character.id} name={character.title || 'this character'} />
      <FromShards characterId={character.id} />
    </>
  );
}

function Module({
  title,
  blurb,
  count,
  children,
}: {
  title: string;
  blurb: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <details className="panel module">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.05rem] font-semibold">{title}</span>
          <span className="block text-[0.82rem] text-muted">{blurb}</span>
        </span>
        <span className="chip flex-none">{count}</span>
      </summary>
      <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">{children}</div>
    </details>
  );
}

function ArcType({ character }: { character: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const current = fieldText(character, 'arc.type');
  const hint = ARC_TYPES.find((a) => a.key === current)?.hint;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label">Arc type</span>
      <div role="group" aria-label="Arc type" className="flex flex-wrap gap-1.5">
        {ARC_TYPES.map((a) => (
          <button
            key={a.key}
            type="button"
            className="seg"
            aria-pressed={current === a.key}
            onClick={() =>
              updateEntry(ws, character.id, {}, { 'arc.type': current === a.key ? '' : a.key })
            }
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="text-[0.82rem] text-muted">
        {hint ? `${hint} ` : ''}
        <InfoLink topic="Character arcs" label="About character arcs" />
      </p>
    </div>
  );
}

/** How this character connects to the rest of the cast. Notes are this character’s view. */
function Relationships({ character }: { character: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const outgoing = useLinks({ kind: 'related', fromId: character.id });
  const incoming = useLinks({ kind: 'related', toId: character.id });
  const cast = useEntries('character');
  const castById = useEntryMap(cast.data);
  const notes = relationNotes(character);
  const [adding, setAdding] = useState('');

  const related = (outgoing.data ?? []).flatMap((l) => castById.get(l.toId) ?? []);
  const relatedIds = new Set(related.map((c) => c.id));
  const namedBy = (incoming.data ?? []).flatMap((l) => castById.get(l.fromId) ?? []);
  const options = useMemo(
    () =>
      (cast.data ?? [])
        .filter((c) => c.id !== character.id && !relatedIds.has(c.id))
        .sort((a, b) => a.title.localeCompare(b.title)),
    // relatedIds is derived from outgoing.data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cast.data, character.id, outgoing.data],
  );

  const add = () => {
    if (!adding) return;
    addLink(ws, character.id, 'related', adding);
    setAdding('');
  };

  return (
    <Module
      title="Relationships"
      blurb="Who they’re tied to, and how they see each other."
      count={`${related.length}`}
    >
      {related.length === 0 && (
        <p className="text-[0.9rem] text-muted">No relationships yet. Add someone from the cast.</p>
      )}
      {related.map((other) => (
        <RelationRow
          key={other.id}
          character={character}
          other={other}
          note={notes[other.id] ?? ''}
          onRemove={() => {
            removeLink(ws, character.id, 'related', other.id);
            updateEntry(ws, character.id, {}, { [`relations.${other.id}`]: removedField() });
          }}
        />
      ))}
      {options.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-[180px] flex-1">
            <span className="sr-only">Add a relationship</span>
            <select className="txt" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Choose someone from the cast…</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || 'Unnamed character'}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-small" disabled={!adding} onClick={add}>
            Add
          </button>
        </div>
      ) : (
        cast.data &&
        related.length === 0 && (
          <p className="text-[0.85rem] text-muted">Add more characters to connect them.</p>
        )
      )}
      {namedBy.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <span className="label">How others see them</span>
          <ul className="flex flex-col gap-1">
            {namedBy.map((other) => (
              <li key={other.id} className="text-[0.9rem]">
                <Link
                  to="/characters/$characterId"
                  params={{ characterId: other.id }}
                  className="font-semibold text-accent hover:underline"
                >
                  {other.title || 'Unnamed character'}
                </Link>
                <span className="text-muted">
                  {relationNotes(other)[character.id]
                    ? `: ${relationNotes(other)[character.id]}`
                    : ' hasn’t said yet.'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Module>
  );
}

function RelationRow({
  character,
  other,
  note,
  onRemove,
}: {
  character: Entry;
  other: Entry;
  note: string;
  onRemove: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const field = useAutosaved(note, (v) =>
    updateEntry(ws, character.id, {}, { [`relations.${other.id}`]: v.trim() }),
  );
  const name = other.title || 'Unnamed character';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/characters/$characterId"
        params={{ characterId: other.id }}
        className="chip flex-none hover:underline"
      >
        {name}
      </Link>
      <label className="min-w-[180px] flex-1">
        <span className="sr-only">
          How {character.title || 'they'} sees {name}
        </span>
        <input className="txt" placeholder="e.g. Older sister. Owes her a debt." {...field.props} />
      </label>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Remove ${name}`}
        title={`Remove ${name}`}
        onClick={onRemove}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

/** Shards this character grew out of. */
function FromShards({ characterId }: { characterId: string }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const links = useLinks({ kind: 'source', fromId: characterId });
  const shards = useEntries('shard');
  const shardsById = useEntryMap(shards.data);
  const sources = (links.data ?? []).flatMap((l) => shardsById.get(l.toId) ?? []);
  if (sources.length === 0) return null;
  return (
    <section data-sec="shard" className="flex flex-col gap-2.5">
      <h2 className="text-[1.05rem]">From your shards</h2>
      <div className={cardGrid}>
        {sources.map((s) => (
          <ShardCard
            key={s.id}
            shard={s}
            action={
              <span className="flex gap-1">
                <Link
                  to="/shards/$shardId"
                  params={{ shardId: s.id }}
                  className="btn btn-ghost btn-small"
                >
                  Open
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  aria-label="Unlink from this character"
                  title="Unlink from this character"
                  onClick={() => removeLink(ws, characterId, 'source', s.id)}
                >
                  <Icon name="close" size={14} />
                </button>
              </span>
            }
          />
        ))}
      </div>
    </section>
  );
}
