import type { Entry } from '../../data/types';
import { groupNote } from '../shards/groupModel';
import { shardText, shardTitle } from '../shards/shardModel';
import { createConcept } from './conceptModel';

/**
 * A new concept from a shard group: named after it, with the group's note as a
 * start. It links to the group, so shards added to the group later show up too.
 */
export function conceptFromGroup(workspaceId: string, group: Entry): string {
  return createConcept(workspaceId, {
    title: group.title,
    notes: groupNote(group),
    sourceIds: [group.id],
  });
}

/** A new concept straight from shards picked in the Shard Mines. */
export function conceptFromShards(workspaceId: string, shards: Entry[]): string {
  return createConcept(workspaceId, {
    title: shards.length === 1 ? shardTitle(shardText(shards[0]!), 60) : '',
    sourceIds: shards.map((s) => s.id),
  });
}
