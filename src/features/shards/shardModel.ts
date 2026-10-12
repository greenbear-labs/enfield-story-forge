import type { Entry } from '../../data/types';
import { createEntry, updateEntry } from '../../lib/entries/entries';
import { matchesQuery, newestFirst } from '../../lib/entries/model';

/** Shard types, from v1-spec-and-data-model.md (plus "question", from the station blurb). */
export const SHARD_TYPES = [
  { key: 'moment', label: 'Moment' },
  { key: 'character', label: 'Character' },
  { key: 'location', label: 'Place' },
  { key: 'premise', label: 'Premise' },
  { key: 'theme', label: 'Theme' },
  { key: 'magic', label: 'Magic' },
  { key: 'item', label: 'Item' },
  { key: 'question', label: 'Question' },
  { key: 'other', label: 'Other' },
] as const;
export type ShardType = (typeof SHARD_TYPES)[number]['key'];

const TYPE_LABELS = new Map<string, string>(SHARD_TYPES.map((t) => [t.key, t.label]));

export const shardTypeLabel = (type: string) => TYPE_LABELS.get(type) ?? 'Other';

/** A shard's text lives in fields.text; its title is derived from it for lists and search. */
export const shardText = (e: Entry) => (typeof e.fields.text === 'string' ? e.fields.text : '');

export const shardType = (e: Entry): ShardType =>
  typeof e.fields.shardType === 'string' && TYPE_LABELS.has(e.fields.shardType)
    ? (e.fields.shardType as ShardType)
    : 'other';

/** The first line of the text, cut at a word boundary if it's long. */
export function shardTitle(text: string, max = 80): string {
  const line = text.trim().split('\n')[0]?.trim() ?? '';
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export interface ShardInput {
  text: string;
  shardType: ShardType;
  tags?: string[];
}

export function createShard(workspaceId: string, input: ShardInput): string {
  return createEntry(workspaceId, {
    type: 'shard',
    title: shardTitle(input.text),
    fields: { text: input.text.trim(), shardType: input.shardType },
    tags: input.tags,
  });
}

export function saveShardText(workspaceId: string, id: string, text: string): void {
  updateEntry(workspaceId, id, { title: shardTitle(text) }, { text: text.trim() });
}

/** Shards matching a search and an optional type, newest first. */
export function filterShards(
  shards: Entry[],
  { query, type }: { query: string; type: ShardType | null },
): Entry[] {
  return shards
    .filter((s) => (type ? shardType(s) === type : true) && matchesQuery(s, query))
    .sort(newestFirst);
}
