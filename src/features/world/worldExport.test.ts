import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { notebookMarkdown } from './worldExport';

describe('notebook export', () => {
  it('writes indexes, pages with their values and writing, and pages inside pages', () => {
    const notebook = fakeShard('', {
      id: 'n1',
      type: 'notebook',
      title: 'Salt Isles',
      fields: { description: 'A sea world' },
    });
    const entries = [
      notebook,
      fakeShard('', {
        id: 'i1',
        type: 'index',
        parentId: 'n1',
        title: 'Places',
        fields: { columns: { k: { name: 'Kind', type: 'choice', pos: 0 } } },
      }),
      fakeShard('', { id: 'i2', type: 'index', parentId: 'n1', title: 'Ships', order: '2' }),
      fakeShard('', {
        id: 'p1',
        type: 'page',
        parentId: 'i1',
        title: 'Port Vell',
        fields: { props: { k: 'City' } },
      }),
      fakeShard('', { id: 'p2', type: 'page', parentId: 'p1', title: 'The Old Docks' }),
      fakeShard('', {
        id: 'gone',
        type: 'page',
        parentId: 'i1',
        title: 'Gone',
        deletedAt: {} as never,
      }),
    ];
    const bodies = new Map<string, unknown>([
      [
        'p1',
        {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'History' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Founded by smugglers.' }] },
          ],
        },
      ],
    ]);
    expect(notebookMarkdown(notebook, entries, bodies, 2).join('\n')).toBe(
      [
        '## Salt Isles',
        '',
        '*A sea world*',
        '',
        '### Places',
        '',
        '#### Port Vell',
        '',
        '- **Kind:** City',
        '',
        '##### History\n\nFounded by smugglers.',
        '',
        '##### The Old Docks',
        '',
        '### Ships',
        '',
        'Nothing here yet.',
        '',
      ].join('\n'),
    );
  });
});
