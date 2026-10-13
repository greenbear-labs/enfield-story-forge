import { Link, useNavigate } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { removeLink, restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { EntryGallery } from '../images/EntryGallery';
import { ShardCard, cardGrid } from '../shards/ShardCard';
import {
  CONCEPT_STATUSES,
  conceptGenre,
  conceptLogline,
  conceptNotes,
  conceptStatus,
} from './conceptModel';

export function ConceptPage({ conceptId }: { conceptId: string }) {
  const concept = useEntry(conceptId);
  const ws = useAuthStore((s) => s.workspaceId)!;

  return (
    <div data-sec="concept" className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <h1 className="sr-only">{concept.data?.title || 'Concept'}</h1>
      <Link
        to="/concepts"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Concepts
      </Link>
      {concept.data === undefined ? (
        concept.error ? (
          <EmptyState>Couldn’t load this concept. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : concept.data === null ? (
        <EmptyState>
          This concept doesn’t exist. It may have been deleted on another device.
        </EmptyState>
      ) : concept.data.deletedAt ? (
        <div className="empty-state flex flex-col items-center gap-3">
          <p>This concept is in the trash.</p>
          <button type="button" className="btn" onClick={() => restoreEntry(ws, conceptId)}>
            Restore it
          </button>
        </div>
      ) : (
        <ConceptEditor key={concept.data.id} concept={concept.data} />
      )}
    </div>
  );
}

function ConceptEditor({ concept }: { concept: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const title = useAutosaved(concept.title, (v) =>
    updateEntry(ws, concept.id, { title: v.trim() || 'Untitled concept' }),
  );
  const logline = useAutosaved(conceptLogline(concept), (v) =>
    updateEntry(ws, concept.id, {}, { logline: v.trim() }),
  );
  const genre = useAutosaved(conceptGenre(concept), (v) =>
    updateEntry(ws, concept.id, {}, { genre: v.trim() }),
  );
  const notes = useAutosaved(conceptNotes(concept), (v) =>
    updateEntry(ws, concept.id, {}, { notes: v }),
  );

  const onDelete = () => {
    [title, logline, genre, notes].forEach((f) => f.flush());
    trashEntry(ws, concept.id);
    void navigate({ to: '/concepts' });
    toast('Concept moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, concept.id) },
    });
  };

  return (
    <>
      <article className="panel flex flex-col gap-4 border-t-4 border-t-accent">
        <div className="flex flex-col gap-1">
          <span className="label">Concept</span>
          <label>
            <span className="sr-only">Concept name</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.8rem] font-semibold outline-none max-sm:text-[1.5rem]"
              {...title.props}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Logline</span>
          <textarea
            className="txt min-h-20 text-[1.1rem]"
            placeholder="Who it’s about, what they want, and what stands in the way, in one sentence."
            {...logline.props}
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="label">Status</span>
            <div role="group" aria-label="Status" className="flex flex-wrap gap-1.5">
              {CONCEPT_STATUSES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="seg"
                  aria-pressed={conceptStatus(concept) === s.key}
                  onClick={() => updateEntry(ws, concept.id, { status: s.key })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className="label">Genre</span>
            <input className="txt" placeholder="e.g. Fantasy, cozy mystery" {...genre.props} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Notes</span>
          <textarea
            className="txt min-h-32"
            placeholder="What excites you about it? What’s still a question?"
            {...notes.props}
          />
        </label>
        <EntryGallery entry={concept} />
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            data-sec="story"
            className="btn text-accent"
            onClick={() => {
              [title, logline, genre, notes].forEach((f) => f.flush());
              void navigate({ to: '/outlines/new', search: { concept: concept.id } });
            }}
          >
            Send to Outline Builder →
          </button>
          <button
            type="button"
            className="btn btn-ai"
            onClick={() => toast('AI help arrives in a later version.')}
          >
            Sharpen with AI
          </button>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onDelete}>
            <Icon name="trash" size={16} />
            Delete
          </button>
        </div>
      </article>
      <Sources conceptId={concept.id} />
    </>
  );
}

/** The shards and shard groups this concept came from. A group's shards are shown too. */
function Sources({ conceptId }: { conceptId: string }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const links = useLinks({ kind: 'source', fromId: conceptId });
  const members = useLinks({ kind: 'member' });
  const shards = useEntries('shard');
  const groups = useEntries('shard_group');
  const concepts = useEntries('concept');
  const shardsById = useEntryMap(shards.data);
  const groupsById = useEntryMap(groups.data);
  const conceptsById = useEntryMap(concepts.data);

  const sourceIds = new Set((links.data ?? []).map((l) => l.toId));
  const sourceGroups = [...sourceIds].flatMap((id) => groupsById.get(id) ?? []);
  const sourceConcepts = [...sourceIds].flatMap((id) => conceptsById.get(id) ?? []);
  const viaGroups = new Set(
    (members.data ?? []).filter((l) => sourceIds.has(l.fromId)).map((l) => l.toId),
  );
  const sourceShards = [...new Set([...sourceIds, ...viaGroups])].flatMap(
    (id) => shardsById.get(id) ?? [],
  );
  const sources = [...sourceConcepts, ...sourceGroups, ...sourceShards];

  if (sources.length === 0) return null;
  return (
    <>
      {sourceConcepts.length > 0 && (
        <section className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.05rem]">Mashed up from</h2>
          {sourceConcepts.map((c) => (
            <Link
              key={c.id}
              to="/concepts/$conceptId"
              params={{ conceptId: c.id }}
              className="chip hover:underline"
            >
              {c.title || 'Untitled concept'}
            </Link>
          ))}
        </section>
      )}
      {sourceGroups.length + sourceShards.length > 0 && (
        <section data-sec="shard" className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.05rem]">From your shards</h2>
            {sourceGroups.map((g) => (
              <Link
                key={g.id}
                to="/shards/groups/$groupId"
                params={{ groupId: g.id }}
                className="chip hover:underline"
              >
                {g.title || 'Untitled group'}
              </Link>
            ))}
          </div>
          {sourceShards.length > 0 && (
            <div className={cardGrid}>
              {sourceShards.map((s) => (
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
                      {sourceIds.has(s.id) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          aria-label="Unlink from this concept"
                          title="Unlink from this concept"
                          onClick={() => removeLink(ws, conceptId, 'source', s.id)}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
