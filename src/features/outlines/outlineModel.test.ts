import { describe, expect, it } from 'vitest';
import { fakeShard, ts } from '../../test/entries';
import {
  beatNote,
  beatsFilled,
  groupBySeries,
  outlineStructure,
  outlineSummary,
  spineFor,
  SPINE_SLOTS,
  START_METHODS,
} from './outlineModel';
import { STRUCTURES } from './structures';

const book = (title: string, opts: Parameters<typeof fakeShard>[1] = {}) =>
  fakeShard('', { type: 'book', title, ...opts });

describe('structures', () => {
  it('has unique keys and beats in story order between 0 and 1', () => {
    expect(new Set(STRUCTURES.map((s) => s.key)).size).toBe(STRUCTURES.length);
    for (const s of STRUCTURES) {
      expect(new Set(s.beats.map((b) => b.key)).size).toBe(s.beats.length);
      const positions = s.beats.map((b) => b.position);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(positions.every((p) => p > 0 && p < 1)).toBe(true);
    }
    expect(STRUCTURES.find((s) => s.key === 'monomyth')!.beats).toHaveLength(17);
  });
});

describe('outlines', () => {
  it('walks every spine slot exactly once, whatever the way in', () => {
    for (const m of START_METHODS) {
      const keys = spineFor(m.key).map((s) => s.key);
      expect([...keys].sort()).toEqual(SPINE_SLOTS.map((s) => s.key).sort());
    }
    expect(spineFor('theme')[0]!.key).toBe('themeQuestion');
    expect(spineFor('character')[0]!.key).toBe('want');
  });

  it('keeps beat notes per structure and counts the current one', () => {
    const b = book('Salt', {
      fields: {
        structure: 'three-act',
        beatNotes: {
          'three-act': { midpoint: 'The key is fake.' },
          monomyth: { call: 'A letter' },
        },
      },
    });
    expect(outlineStructure(b).key).toBe('three-act');
    expect(beatNote(b, 'monomyth', 'call')).toBe('A letter');
    expect(beatsFilled(b)).toEqual({ filled: 1, total: 8 });
    expect(outlineSummary(b).beats).toEqual([['Midpoint', 'The key is fake.']]);
  });

  it('falls back to the Monomyth for an unknown structure', () => {
    expect(outlineStructure(book('x', { fields: { structure: 'nope' } })).key).toBe('monomyth');
  });

  it('groups books by series, then the standalone ones', () => {
    const s = fakeShard('', { type: 'series', title: 'Tides' });
    const empty = fakeShard('', { type: 'series', title: 'Ashes' });
    const b1 = book('One', { parentId: s.id, updatedAt: ts(1) });
    const b2 = book('Two', { parentId: s.id, updatedAt: ts(2) });
    const loose = book('Loose', { parentId: null });
    const groups = groupBySeries([b1, loose, b2], [s, empty]);
    expect(groups.map((g) => [g.series?.title ?? null, g.books.map((b) => b.title)])).toEqual([
      ['Ashes', []],
      ['Tides', ['Two', 'One']],
      [null, ['Loose']],
    ]);
  });
});
