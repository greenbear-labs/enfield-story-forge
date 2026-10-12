import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import { useEntries, useEntryMap } from '../../lib/entries/hooks';
import { newestFirst } from '../../lib/entries/model';
import { useAuthStore } from '../auth/authStore';
import { addToGroup, createShardGroup } from './groupModel';
import { addToCart, clearCart, removeFromCart, useMineCart } from './mineCart';
import { cardGrid, ShardCard } from './ShardCard';
import { ShardFilters, type ShardFilterState } from './ShardFilters';
import { filterShards, shardText } from './shardModel';
import { BackToShards } from './ShardPage';

/** Pick shards into the mine cart, then forge them into a group. */
export function ShardMinesPage({ targetGroupId }: { targetGroupId?: string }) {
  const shards = useEntries('shard');
  const [filter, setFilter] = useState<ShardFilterState>({ query: '', type: null });
  const cartIds = useMineCart((s) => s.shardIds);
  const visible = useMemo(() => filterShards(shards.data ?? [], filter), [shards.data, filter]);

  return (
    <div data-sec="shard" className="flex flex-col gap-4">
      <BackToShards />
      <header className="sthead !grid-cols-[auto_1fr] max-sm:!grid-cols-1">
        <div className="badge">
          <Icon name="mine" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Story Shards tool</div>
          <h1>The Shard Mines</h1>
          <p className="mt-1 max-w-[62ch]">
            Pick the shards that belong together and drop them in the mine cart. Then forge them
            into a shard group you can shape into a concept.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_340px] items-start gap-4 max-[900px]:grid-cols-1">
        <section className="flex min-w-0 flex-col gap-2.5 max-[900px]:order-2">
          <h2 className="text-[1.05rem]">Your shards</h2>
          {shards.data === undefined ? (
            <Loading />
          ) : shards.data.length === 0 ? (
            <EmptyState>No shards to mine yet. Capture a few with + Shard first.</EmptyState>
          ) : (
            <>
              <ShardFilters value={filter} onChange={setFilter} />
              {visible.length === 0 ? (
                <EmptyState>No shards match.</EmptyState>
              ) : (
                <div className={cardGrid}>
                  {visible.map((s) => {
                    const inCart = cartIds.includes(s.id);
                    return (
                      <ShardCard
                        key={s.id}
                        shard={s}
                        action={
                          <button
                            type="button"
                            className={`btn btn-small ${inCart ? 'btn-primary' : ''}`}
                            aria-pressed={inCart}
                            onClick={() => (inCart ? removeFromCart(s.id) : addToCart(s.id))}
                          >
                            {inCart ? (
                              <>
                                <Icon name="check" size={14} /> In cart
                              </>
                            ) : (
                              '+ Cart'
                            )}
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <MineCartPanel targetGroupId={targetGroupId} />
      </div>
    </div>
  );
}

function MineCartPanel({ targetGroupId }: { targetGroupId?: string }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const cartIds = useMineCart((s) => s.shardIds);
  const shards = useEntries('shard');
  const groups = useEntries('shard_group');
  const shardsById = useEntryMap(shards.data);
  const groupList = useMemo(() => [...(groups.data ?? [])].sort(newestFirst), [groups.data]);

  // Shards deleted since they were picked drop out of the cart.
  const inCart = cartIds.flatMap((id) => shardsById.get(id) ?? []);
  const [mode, setMode] = useState<'new' | 'existing'>(targetGroupId ? 'existing' : 'new');
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState(targetGroupId ?? '');
  const groupId = chosen || groupList[0]?.id || '';

  const forge = (e: FormEvent) => {
    e.preventDefault();
    if (inCart.length === 0) return;
    const ids = inCart.map((s) => s.id);
    let id = groupId;
    if (mode === 'new') {
      id = createShardGroup(ws, name, ids);
      toast(`Forged a group of ${ids.length} ${ids.length === 1 ? 'shard' : 'shards'}.`);
    } else {
      if (!id) return;
      addToGroup(ws, id, ids);
      toast(`Added ${ids.length} ${ids.length === 1 ? 'shard' : 'shards'} to the group.`);
    }
    clearCart();
    void navigate({ to: '/shards/groups/$groupId', params: { groupId: id } });
  };

  return (
    <aside
      aria-label="Mine cart"
      className="panel sticky top-[110px] flex flex-col gap-3 border-t-4 border-t-accent max-[900px]:static max-[900px]:order-1"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[1.05rem]">
          <Icon name="mine" className="text-accent" /> Mine cart
        </h2>
        <span className="font-mono text-[0.8rem] text-muted">{inCart.length}</span>
      </div>

      {inCart.length === 0 ? (
        <p className="text-[0.85rem] text-muted">Empty. Pick shards with + Cart.</p>
      ) : (
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {inCart.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-md bg-accent-soft px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-[0.85rem]">{shardText(s)}</span>
              <button
                type="button"
                className="border-0 bg-transparent p-0.5 text-accent"
                aria-label="Take out of the cart"
                onClick={() => removeFromCart(s.id)}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="flex flex-col gap-2 border-t border-line pt-3" onSubmit={forge}>
        <div role="group" aria-label="Forge into" className="flex gap-1.5">
          <button
            type="button"
            className="seg"
            aria-pressed={mode === 'new'}
            onClick={() => setMode('new')}
          >
            New group
          </button>
          <button
            type="button"
            className="seg"
            aria-pressed={mode === 'existing'}
            disabled={groupList.length === 0}
            onClick={() => setMode('existing')}
          >
            Existing group
          </button>
        </div>
        {mode === 'new' ? (
          <label className="flex flex-col gap-1">
            <span className="text-[0.85rem] font-medium">Group name</span>
            <input
              className="txt"
              placeholder="e.g. The drowned city"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-[0.85rem] font-medium">Add to</span>
            <select className="txt" value={groupId} onChange={(e) => setChosen(e.target.value)}>
              {groupList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title || 'Untitled group'}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="btn btn-primary" disabled={inCart.length === 0}>
          {mode === 'new' ? 'Forge a shard group' : 'Add to the group'}
        </button>
        <button
          type="button"
          data-sec="concept"
          className="btn text-accent"
          disabled={inCart.length === 0}
          onClick={() =>
            toast('Forging straight into a concept arrives with the Concepts station.')
          }
        >
          Forge into a concept →
        </button>
      </form>
    </aside>
  );
}
