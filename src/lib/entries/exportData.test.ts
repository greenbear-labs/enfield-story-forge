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

  it('writes characters with labeled fields and relationships', () => {
    const a = fakeShard('', {
      type: 'character',
      title: 'Mira',
      fields: { role: 'Protagonist', arc: { lie: 'Nobody stays.' }, relations: {} },
    });
    const b = fakeShard('', { type: 'character', title: 'Tam', fields: {} });
    (a.fields.relations as Record<string, string>)[b.id] = 'Her brother';
    const md = toMarkdown(
      [a, b],
      [{ id: 'x', workspaceId: 'u1', fromId: a.id, toId: b.id, kind: 'related' }],
    );
    expect(md).toContain('### Mira\n\n- **Role:** Protagonist\n- **The lie:** Nobody stays.');
    expect(md).toContain('- **Relationship:** Tam: Her brother');
  });
});
