import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { TagInput } from '../../components/ui/TagInput';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry, useLinks } from '../../lib/entries/hooks';
import { useDebouncedSave } from '../../lib/entries/useDebouncedSave';
import { useAuthStore } from '../auth/authStore';
import { createCharacter } from '../characters/characterModel';
import { addToCart, useMineCart } from './mineCart';
import { saveShardText, shardText, shardType } from './shardModel';
import { ShardTypePicker } from './ShardTypePicker';

export function ShardPage({ shardId }: { shardId: string }) {
  const shard = useEntry(shardId);

  return (
    <div data-sec="shard" className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <BackToShards />
      {shard.data === undefined ? (
        shard.error ? (
          <EmptyState>Couldn’t load this shard. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : shard.data === null ? (
        <EmptyState>
          This shard doesn’t exist. It may have been deleted on another device.
        </EmptyState>
      ) : shard.data.deletedAt ? (
        <Trashed shard={shard.data} />
      ) : (
        // Keyed so the editor starts from this shard's saved text.
        <ShardEditor key={shard.data.id} shard={shard.data} />
      )}
    </div>
  );
}

export function BackToShards() {
  return (
    <Link
      to="/shards"
      className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
    >
      <Icon name="arrowLeft" size={16} />
      Story Shards
    </Link>
  );
}

function Trashed({ shard }: { shard: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  return (
    <div className="empty-state flex flex-col items-center gap-3">
      <p>This shard is in the trash.</p>
      <button type="button" className="btn" onClick={() => restoreEntry(ws, shard.id)}>
        Restore it
      </button>
    </div>
  );
}

function ShardEditor({ shard }: { shard: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [text, setText] = useState(() => shardText(shard));
  const { schedule, flush } = useDebouncedSave((value: string) =>
    saveShardText(ws, shard.id, value),
  );
  const inCart = useMineCart((s) => s.shardIds.includes(shard.id));

  const onDelete = () => {
    flush();
    trashEntry(ws, shard.id);
    void navigate({ to: '/shards' });
    toast('Shard moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, shard.id) },
    });
  };

  return (
    <article className="panel flex flex-col gap-4 border-t-4 border-t-accent">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label">Story shard</span>
        <span className="text-[0.78rem] text-muted">
          Saved {shard.createdAt ? shard.createdAt.toDate().toLocaleDateString() : 'just now'}
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Shard text</span>
        <textarea
          className="txt min-h-40 text-[1.05rem]"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            schedule(e.target.value);
          }}
          onBlur={flush}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="label">Type</span>
        <ShardTypePicker
          value={shardType(shard)}
          onChange={(t) => updateEntry(ws, shard.id, {}, { shardType: t })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="shard-tags">
          Tags
        </label>
        <TagInput
          id="shard-tags"
          tags={shard.tags}
          onChange={(tags) => updateEntry(ws, shard.id, { tags })}
        />
      </div>
      <InGroups shardId={shard.id} />
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          className="btn"
          disabled={inCart}
          onClick={() => {
            addToCart(shard.id);
            toast('Added to the mine cart.', {
              action: {
                label: 'Open the Mines',
                onClick: () => void navigate({ to: '/shards/mines' }),
              },
            });
          }}
        >
          <Icon name="mine" size={16} />
          {inCart ? 'In the mine cart' : 'Add to the mine cart'}
        </button>
        {shardType(shard) === 'character' && (
          <button
            type="button"
            data-sec="char"
            className="btn text-accent"
            onClick={() => {
              flush();
              const id = createCharacter(ws, {
                notes: text,
                sourceIds: [shard.id],
              });
              toast('Added to the cast. Give them a name.');
              void navigate({ to: '/characters/$characterId', params: { characterId: id } });
            }}
          >
            <Icon name="char" size={16} />
            Make a character
          </button>
        )}
        <button
          type="button"
          className="btn btn-ai"
          onClick={() => toast('AI help arrives in a later version.')}
        >
          Expand with AI
        </button>
        <button type="button" className="btn btn-ghost ml-auto" onClick={onDelete}>
          <Icon name="trash" size={16} />
          Delete
        </button>
      </div>
    </article>
  );
}

/** Backlinks: the groups this shard belongs to. */
function InGroups({ shardId }: { shardId: string }) {
  const links = useLinks({ kind: 'member', toId: shardId });
  const groups = useEntries('shard_group');
  const inGroups = useMemo(() => {
    const ids = new Set((links.data ?? []).map((l) => l.fromId));
    return (groups.data ?? []).filter((g) => ids.has(g.id));
  }, [links.data, groups.data]);

  if (inGroups.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label">In groups</span>
      <div className="flex flex-wrap gap-1.5">
        {inGroups.map((g) => (
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
    </div>
  );
}
