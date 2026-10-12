import { describe, expect, it } from 'vitest';
import { fakeGroup, fakeShard, memberLink, ts } from '../../test/entries';
import { toMarkdown } from './exportData';

describe('toMarkdown', () => {
  it('writes groups with their shards, then every shard, skipping the trash', () => {
    const s1 = fakeShard('A city that moves at night', { shardType: 'location', tags: ['city'] });
    const gone = fakeShard('Deleted idea', { deletedAt: ts(1) });
    const g = fakeGroup('Night city');
    const md = toMarkdown([s1, gone, g], [memberLink(g.id, s1.id)], new Date('2026-10-12'));

    expect(md).toContain('Exported 2026-10-12.');
    expect(md).toContain('### Night city\n\n- A city that moves at night');
    expect(md).toContain('*location · #city*');
    expect(md).not.toContain('Deleted idea');
  });
});
