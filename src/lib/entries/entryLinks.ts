import type { Entry } from '../../data/types';

/** Where an entry opens in the app, for entry types that have a page so far. */
export function entryRoute(
  entry: Pick<Entry, 'id' | 'type'>,
):
  | { to: '/shards/$shardId'; params: { shardId: string } }
  | { to: '/shards/groups/$groupId'; params: { groupId: string } }
  | null {
  switch (entry.type) {
    case 'shard':
      return { to: '/shards/$shardId', params: { shardId: entry.id } };
    case 'shard_group':
      return { to: '/shards/groups/$groupId', params: { groupId: entry.id } };
    default:
      return null;
  }
}

const TYPE_NAMES: Partial<Record<Entry['type'], string>> = {
  shard: 'Shard',
  shard_group: 'Shard group',
  concept: 'Concept',
  character: 'Character',
  page: 'World page',
};

export const entryTypeName = (type: Entry['type']) => TYPE_NAMES[type] ?? type;
