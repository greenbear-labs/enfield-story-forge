import type { Entry } from '../../data/types';

/** Where an entry opens in the app, for entry types that have a page so far. */
export function entryRoute(
  entry: Pick<Entry, 'id' | 'type'>,
):
  | { to: '/shards/$shardId'; params: { shardId: string } }
  | { to: '/shards/groups/$groupId'; params: { groupId: string } }
  | { to: '/concepts/$conceptId'; params: { conceptId: string } }
  | { to: '/characters/$characterId'; params: { characterId: string } }
  | { to: '/outlines/$outlineId'; params: { outlineId: string } }
  | null {
  switch (entry.type) {
    case 'shard':
      return { to: '/shards/$shardId', params: { shardId: entry.id } };
    case 'shard_group':
      return { to: '/shards/groups/$groupId', params: { groupId: entry.id } };
    case 'concept':
      return { to: '/concepts/$conceptId', params: { conceptId: entry.id } };
    case 'book':
      return { to: '/outlines/$outlineId', params: { outlineId: entry.id } };
    case 'character':
      return { to: '/characters/$characterId', params: { characterId: entry.id } };
    default:
      return null;
  }
}

const TYPE_NAMES: Partial<Record<Entry['type'], string>> = {
  shard: 'Shard',
  shard_group: 'Shard group',
  concept: 'Concept',
  character: 'Character',
  book: 'Outline',
  series: 'Series',
  page: 'World page',
};

export const entryTypeName = (type: Entry['type']) => TYPE_NAMES[type] ?? type;
