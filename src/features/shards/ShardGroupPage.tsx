import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { newestFirst } from '../../lib/entries/model';
import { useDebouncedSave } from '../../lib/entries/useDebouncedSave';
import { useAuthStore } from '../auth/authStore';
import { conceptFromGroup } from '../concepts/fromShards';
import { groupNote, membersByGroup, removeFromGroup } from './groupModel';
import { cardGrid, ShardCard } from './ShardCard';
import { BackToShards } from './ShardPage';

export function ShardGroupPage({ groupId }: { groupId: string }) {
  const group = useEntry(groupId);
  const ws = useAuthStore((s) => s.workspaceId)!;

  return (
    <div data-sec="shard" className="flex flex-col gap-4">
      <BackToShards />
      {group.data === undefined ? (
        group.error ? (
          <EmptyState>Couldn’t load this group. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : group.data === null ? (
        <EmptyState>
          This group doesn’t exist. It may have been deleted on another device.
        </EmptyState>
      ) : group.data.deletedAt ? (
        <div className="empty-state flex flex-col items-center gap-3">
          <p>This group is in the trash. Its shards are still in your library.</p>
          <button type="button" className="btn" onClick={() => restoreEntry(ws, groupId)}>
            Restore it
          </button>
        </div>
      ) : (
        <GroupEditor key={group.data.id} group={group.data} />
      )}
    </div>
  );
}

function GroupEditor({ group }: { group: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [title, setTitle] = useState(group.title);
  const [note, setNote] = useState(() => groupNote(group));
  const titleSave = useDebouncedSave((v: string) =>
    updateEntry(ws, group.id, { title: v.trim() || 'Untitled group' }),
  );
  const noteSave = useDebouncedSave((v: string) => updateEntry(ws, group.id, {}, { note: v }));

  const links = useLinks({ kind: 'member', fromId: group.id });
  const shards = useEntries('shard');
  const shardsById = useEntryMap(shards.data);
  const members = useMemo(
    () => [...(membersByGroup(links.data ?? [], shardsById).get(group.id) ?? [])].sort(newestFirst),
    [links.data, shardsById, group.id],
  );

  const onDelete = () => {
    titleSave.flush();
    noteSave.flush();
    trashEntry(ws, group.id);
    void navigate({ to: '/shards' });
    toast('Group moved to the trash. Its shards are still in your library.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, group.id) },
    });
  };

  return (
    <>
      <header className="sthead !grid-cols-1">
        <div className="min-w-0">
          <div className="eyebrow">Shard group</div>
          <label>
            <span className="sr-only">Group name</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.8rem] font-semibold outline-none max-sm:text-[1.5rem]"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                titleSave.schedule(e.target.value);
              }}
              onBlur={titleSave.flush}
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="sr-only">Notes</span>
            <textarea
              className="txt min-h-16 bg-surface"
              placeholder="What connects these shards? A note to your future self…"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                noteSave.schedule(e.target.value);
              }}
              onBlur={noteSave.flush}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/shards/mines" search={{ group: group.id }} className="btn">
              <Icon name="mine" size={16} />
              Add shards
            </Link>
            <button
              type="button"
              data-sec="concept"
              className="btn text-accent"
              onClick={() => {
                titleSave.flush();
                noteSave.flush();
                const id = conceptFromGroup(ws, {
                  ...group,
                  title,
                  fields: { ...group.fields, note },
                });
                toast('Sent to Concepts as a new concept.');
                void navigate({ to: '/concepts/$conceptId', params: { conceptId: id } });
              }}
            >
              Send to Concepts →
            </button>
            <button type="button" className="btn btn-ghost ml-auto" onClick={onDelete}>
              <Icon name="trash" size={16} />
              Delete group
            </button>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[1.05rem]">
          {members.length} {members.length === 1 ? 'shard' : 'shards'}
        </h2>
        {links.data === undefined || shards.data === undefined ? (
          <Loading />
        ) : members.length === 0 ? (
          <EmptyState>This group is empty. Add shards from the Shard Mines.</EmptyState>
        ) : (
          <div className={cardGrid}>
            {members.map((s) => (
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
                      aria-label="Remove from group"
                      title="Remove from group"
                      onClick={() => removeFromGroup(ws, group.id, s.id)}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
