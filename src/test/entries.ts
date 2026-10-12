import type { Timestamp } from 'firebase/firestore';
import type { Entry, Link } from '../data/types';

/** A stand-in for a Firestore Timestamp. */
export const ts = (ms: number) =>
  ({ toMillis: () => ms, toDate: () => new Date(ms) }) as unknown as Timestamp;

let n = 0;

/** A shard entry for tests. */
export function fakeShard(text: string, opts: Partial<Entry> & { shardType?: string } = {}): Entry {
  n += 1;
  const { shardType = 'moment', ...rest } = opts;
  return {
    id: `s${n}`,
    workspaceId: 'u1',
    type: 'shard',
    title: text.split('\n')[0]!,
    order: String(n),
    fields: { text, shardType },
    modules: [],
    tags: [],
    images: [],
    createdAt: ts(n * 1000),
    updatedAt: ts(n * 1000),
    deletedAt: null,
    ...rest,
  };
}

export function fakeGroup(title: string, opts: Partial<Entry> = {}): Entry {
  return fakeShard('', { type: 'shard_group', title, fields: { note: '' }, ...opts });
}

export const memberLink = (fromId: string, toId: string): Link => ({
  id: `${fromId}__member__${toId}`,
  workspaceId: 'u1',
  fromId,
  toId,
  kind: 'member',
});
