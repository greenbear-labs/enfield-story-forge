import { describe, expect, it } from 'vitest';
import { fakeGroup, fakeShard, memberLink } from '../../test/entries';
import { membersByGroup } from './groupModel';
import { filterShards, shardTitle, shardType } from './shardModel';
import { nextSparkPrompt, SPARK_PROMPTS } from './sparkPrompts';

describe('shards', () => {
  it('titles a shard from its first line, cut at a word', () => {
    expect(shardTitle('  A drowned city\nwith bells  ')).toBe('A drowned city');
    const long = 'word '.repeat(30);
    const title = shardTitle(long, 20);
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(21);
  });

  it('reads an unknown type as other', () => {
    expect(shardType(fakeShard('x', { shardType: 'nonsense' }))).toBe('other');
    expect(shardType(fakeShard('x', { shardType: 'magic' }))).toBe('magic');
  });

  it('filters by type and search, newest first', () => {
    const a = fakeShard('A sword that sings', { shardType: 'item' });
    const b = fakeShard('A singing river', { shardType: 'location' });
    const c = fakeShard('A quiet king', { shardType: 'character' });
    expect(filterShards([a, b, c], { query: '', type: null })).toEqual([c, b, a]);
    expect(filterShards([a, b, c], { query: 'sing', type: null })).toEqual([b, a]);
    expect(filterShards([a, b, c], { query: 'sing', type: 'item' })).toEqual([a]);
  });

  it('groups members and skips shards that are gone', () => {
    const s1 = fakeShard('one');
    const g = fakeGroup('Group');
    const byId = new Map([[s1.id, s1]]);
    const result = membersByGroup([memberLink(g.id, s1.id), memberLink(g.id, 'gone')], byId);
    expect(result.get(g.id)).toEqual([s1]);
  });

  it('never repeats the spark prompt just shown', () => {
    const first = SPARK_PROMPTS[0]!;
    for (const r of [0, 0.5, 0.999]) expect(nextSparkPrompt(first, () => r)).not.toBe(first);
  });
});
