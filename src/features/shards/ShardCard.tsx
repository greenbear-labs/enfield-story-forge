import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { Entry } from '../../data/types';
import { CardCover } from '../images/EntryImg';
import { shardText, shardType, shardTypeLabel } from './shardModel';

/** How a shard looks in every list. Links to the shard unless `action` replaces the link. */
export function ShardCard({ shard, action }: { shard: Entry; action?: ReactNode }) {
  const body = (
    <>
      <CardCover entry={shard} />
      <div className="flex items-center gap-2">
        <span className="chip">{shardTypeLabel(shardType(shard))}</span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <p className="body">{shardText(shard) || 'Empty shard'}</p>
      {shard.tags.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.78rem] text-muted">
          {shard.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}
    </>
  );

  return action ? (
    <div data-sec="shard" className="entry-card">
      {body}
    </div>
  ) : (
    <Link
      to="/shards/$shardId"
      params={{ shardId: shard.id }}
      data-sec="shard"
      className="entry-card"
    >
      {body}
    </Link>
  );
}

export const cardGrid = 'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3';
