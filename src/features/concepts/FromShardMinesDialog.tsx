import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useEntries, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { newestFirst } from '../../lib/entries/model';
import { useAuthStore } from '../auth/authStore';
import { membersByGroup } from '../shards/groupModel';
import { conceptFromGroup } from './fromShards';

/** Pick a shard group to shape into a concept. Groups already used are marked. */
export function FromShardMinesDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const groups = useEntries('shard_group');
  const shards = useEntries('shard');
  const members = useLinks({ kind: 'member' });
  const sources = useLinks({ kind: 'source' });
  const shardsById = useEntryMap(shards.data);
  const byGroup = useMemo(
    () => membersByGroup(members.data ?? [], shardsById),
    [members.data, shardsById],
  );
  const used = useMemo(() => new Set((sources.data ?? []).map((l) => l.toId)), [sources.data]);
  const list = useMemo(() => [...(groups.data ?? [])].sort(newestFirst), [groups.data]);

  return (
    <Dialog title="From the Shard Mines" sec="concept" onClose={onClose} wide>
      <p className="text-[0.9rem] text-muted">
        Pick a shard group. It becomes a new concept with its shards beside it, ready to shape into
        one sentence.
      </p>
      {groups.data === undefined ? (
        <p className="text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <EmptyState>No shard groups yet. Forge one in the Shard Mines first.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.map((g) => {
            const shardsIn = byGroup.get(g.id) ?? [];
            return (
              <li key={g.id}>
                <button
                  type="button"
                  data-sec="shard"
                  className="entry-card w-full"
                  onClick={() => {
                    const id = conceptFromGroup(ws, g);
                    onClose();
                    void navigate({ to: '/concepts/$conceptId', params: { conceptId: id } });
                  }}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-display font-semibold">
                      {g.title || 'Untitled group'}
                    </span>
                    <span className="flex-none font-mono text-[0.75rem] text-muted">
                      {shardsIn.length} {shardsIn.length === 1 ? 'shard' : 'shards'}
                      {used.has(g.id) ? ' · used' : ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
