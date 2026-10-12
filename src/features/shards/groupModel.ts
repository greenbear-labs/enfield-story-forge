import type { Entry, Link } from '../../data/types';
import { addLink, createEntry, removeLink } from '../../lib/entries/entries';

/** A shard group is a `shard_group` entry with a `member` link to each of its shards. */
export function createShardGroup(
  workspaceId: string,
  title: string,
  shardIds: string[],
  note = '',
): string {
  const id = createEntry(workspaceId, {
    type: 'shard_group',
    title: title.trim() || 'Untitled group',
    fields: { note },
  });
  addToGroup(workspaceId, id, shardIds);
  return id;
}

export function addToGroup(workspaceId: string, groupId: string, shardIds: string[]): void {
  for (const shardId of shardIds) addLink(workspaceId, groupId, 'member', shardId);
}

export function removeFromGroup(workspaceId: string, groupId: string, shardId: string): void {
  removeLink(workspaceId, groupId, 'member', shardId);
}

export const groupNote = (g: Entry) => (typeof g.fields.note === 'string' ? g.fields.note : '');

/**
 * The shards in each group, from all member links. Links to shards that are
 * missing (or in the trash) are skipped.
 */
export function membersByGroup(
  links: Link[],
  shardsById: Map<string, Entry>,
): Map<string, Entry[]> {
  const out = new Map<string, Entry[]>();
  for (const link of links) {
    if (link.kind !== 'member') continue;
    const shard = shardsById.get(link.toId);
    if (!shard) continue;
    const list = out.get(link.fromId) ?? [];
    list.push(shard);
    out.set(link.fromId, list);
  }
  return out;
}
