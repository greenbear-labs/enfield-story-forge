import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { linkId, matchesQuery, newEntryData, normalizeTags, orderKey } from './model';

describe('entry model', () => {
  it('fills in defaults for a new entry, with deletedAt stored as null', () => {
    const data = newEntryData('u1', { type: 'shard', title: '  Hi  ', tags: ['A'] }, 0);
    expect(data).toMatchObject({
      workspaceId: 'u1',
      type: 'shard',
      title: 'Hi',
      parentId: null,
      fields: {},
      modules: [],
      images: [],
      tags: ['a'],
      deletedAt: null,
    });
  });

  it('makes order keys that sort by time', () => {
    const keys = [orderKey(5), orderKey(1_700_000_000_000), orderKey(40)];
    expect([...keys].sort()).toEqual([orderKey(5), orderKey(40), orderKey(1_700_000_000_000)]);
  });

  it('normalizes tags', () => {
    expect(normalizeTags([' Magic ', '#magic', 'Dark  Forest', '', 'x'])).toEqual([
      'magic',
      'dark forest',
      'x',
    ]);
  });

  it('gives a link the same id every time', () => {
    expect(linkId('g1', 'member', 's1')).toBe('g1__member__s1');
  });

  it('matches every word of a query across text, title and tags', () => {
    const shard = fakeShard('A lighthouse that keeps ships away', { tags: ['coast'] });
    expect(matchesQuery(shard, '')).toBe(true);
    expect(matchesQuery(shard, 'LIGHTHOUSE ships')).toBe(true);
    expect(matchesQuery(shard, '#coast')).toBe(true);
    expect(matchesQuery(shard, 'lighthouse dragon')).toBe(false);
  });
});
