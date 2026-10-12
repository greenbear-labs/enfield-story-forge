import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { useEntries, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { newestFirst } from '../../lib/entries/model';
import { shardsStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { openCapture } from './captureStore';
import { membersByGroup } from './groupModel';
import { cardGrid, ShardCard } from './ShardCard';
import { ShardFilters, type ShardFilterState } from './ShardFilters';
import { filterShards, shardText } from './shardModel';
import { SparkPromptsDialog } from './SparkPromptsDialog';

export function ShardsStationPage() {
  const navigate = useNavigate();
  const [sparkOpen, setSparkOpen] = useState(false);

  return (
    <StationPage
      content={shardsStation}
      toolActions={{
        'Create a Shard': () => openCapture(),
        'The Shard Mines': () => void navigate({ to: '/shards/mines' }),
        'Spark Prompts': () => setSparkOpen(true),
      }}
    >
      <ShardsLibrary />
      {sparkOpen && <SparkPromptsDialog onClose={() => setSparkOpen(false)} />}
    </StationPage>
  );
}

function ShardsLibrary() {
  const shards = useEntries('shard');
  const groups = useEntries('shard_group');
  const members = useLinks({ kind: 'member' });
  const shardsById = useEntryMap(shards.data);
  const [filter, setFilter] = useState<ShardFilterState>({ query: '', type: null });

  const byGroup = useMemo(
    () => membersByGroup(members.data ?? [], shardsById),
    [members.data, shardsById],
  );
  const visible = useMemo(() => filterShards(shards.data ?? [], filter), [shards.data, filter]);
  const total = shards.data?.length ?? 0;

  return (
    <>
      <StationSection
        title="Shard groups"
        actions={
          <Link to="/shards/mines" className="text-[0.85rem] font-semibold text-accent">
            Open the Shard Mines →
          </Link>
        }
      >
        {groups.data === undefined ? (
          <Loading />
        ) : groups.data.length === 0 ? (
          <EmptyState>No shard groups yet. Forge one in the Shard Mines.</EmptyState>
        ) : (
          <div className={cardGrid}>
            {[...groups.data].sort(newestFirst).map((g) => (
              <GroupCard key={g.id} group={g} shards={byGroup.get(g.id) ?? []} />
            ))}
          </div>
        )}
      </StationSection>

      <StationSection
        title="Shard library"
        actions={
          <button type="button" className="btn btn-small" onClick={() => openCapture()}>
            + New shard
          </button>
        }
      >
        {shards.error ? (
          <EmptyState>Couldn’t load your shards. Check your connection and reload.</EmptyState>
        ) : shards.data === undefined ? (
          <Loading />
        ) : total === 0 ? (
          <EmptyState>No shards yet. Your first spark will land here.</EmptyState>
        ) : (
          <>
            <ShardFilters value={filter} onChange={setFilter} />
            <p className="text-[0.8rem] text-muted">
              {visible.length === total
                ? `${total} ${total === 1 ? 'shard' : 'shards'}`
                : `${visible.length} of ${total} shards`}
            </p>
            {visible.length === 0 ? (
              <EmptyState>No shards match. Try another word or type.</EmptyState>
            ) : (
              <div className={cardGrid}>
                {visible.map((s) => (
                  <ShardCard key={s.id} shard={s} />
                ))}
              </div>
            )}
          </>
        )}
      </StationSection>
    </>
  );
}

function GroupCard({ group, shards }: { group: Entry; shards: Entry[] }) {
  return (
    <Link
      to="/shards/groups/$groupId"
      params={{ groupId: group.id }}
      data-sec="shard"
      className="entry-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate">{group.title || 'Untitled group'}</h3>
        <span className="flex-none font-mono text-[0.75rem] text-muted">
          {shards.length} {shards.length === 1 ? 'shard' : 'shards'}
        </span>
      </div>
      <ul className="flex flex-col gap-1 text-[0.85rem] text-muted">
        {shards.slice(0, 3).map((s) => (
          <li key={s.id} className="truncate">
            · {shardText(s)}
          </li>
        ))}
      </ul>
    </Link>
  );
}
