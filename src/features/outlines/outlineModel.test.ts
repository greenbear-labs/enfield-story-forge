import { describe, expect, it } from 'vitest';
import { fakeShard, ts } from '../../test/entries';
import {
  beatNote,
  beatsFilled,
  chapterCount,
  groupBySeries,
  outlineOverlay,
  outlineStructure,
  outlineSummary,
  spineFor,
  SPINE_SLOTS,
  START_METHODS,
  structuresWithNotes,
} from './outlineModel';
import type { Entry } from '../../data/types';
import { customEntryId, outlinesUsing, structureFromEntry } from './customStructures';
import {
  alignBeats,
  chapterFor,
  setCustomStructures,
  structureByKey,
  STRUCTURES,
} from './structures';

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

describe('overlay and chapters', () => {
  it('puts each overlay beat beside the nearest beat', () => {
    const three = structureByKey('three-act').beats;
    const cat = structureByKey('save-the-cat').beats;
    const aligned = alignBeats(three, cat);
    expect([...aligned.values()].flat()).toHaveLength(cat.length);
    expect(aligned.get('midpoint')!.map((b) => b.key)).toEqual(['midpoint', 'bad-guys']);
    expect(aligned.get('climax')!.map((b) => b.key)).toContain('break-three');
  });

  it('places beats in chapters', () => {
    expect(chapterFor(0.5, 36)).toBe(18);
    expect(chapterFor(0.01, 36)).toBe(1);
    expect(chapterFor(0.99, 10)).toBe(10);
  });

  it('reads the overlay, chapter count, and structures with notes', () => {
    const b = book('x', {
      fields: {
        structure: 'monomyth',
        overlay: 'story-circle',
        chapters: 30,
        beatNotes: {
          monomyth: { call: 'A' },
          'three-act': { setup: ' ' },
          vogler: { ordeal: 'B' },
        },
      },
    });
    expect(outlineOverlay(b)?.key).toBe('story-circle');
    expect(chapterCount(b)).toBe(30);
    expect(structuresWithNotes(b)).toEqual(['monomyth', 'vogler']);
    expect(outlineOverlay(book('y', { fields: { structure: 'vogler', overlay: 'vogler' } }))).toBe(
      null,
    );
    expect(chapterCount(book('z', { fields: { chapters: 0 } }))).toBe(null);
  });
});

describe('custom structures', () => {
  const entry = (fields: Record<string, unknown>, title = 'Braided') =>
    ({ id: 'abc', title, type: 'structure', fields }) as unknown as Entry;

  it('reads beats in story order and clamps their places', () => {
    const s = structureFromEntry(
      entry({
        bestFor: 'Two timelines',
        beats: {
          b: { name: 'Middle', part: 'Act 2', position: 0.5, prompt: '' },
          a: { name: 'Hook', part: 'Act 1', position: -1, prompt: 'Why now?' },
          c: { name: '', part: '', position: 3, prompt: '' },
          bad: 'nope',
        },
      }),
    );
    expect(s.key).toBe('custom-abc');
    expect(s.custom).toBe(true);
    expect(s.bestFor).toBe('Two timelines');
    expect(s.beats.map((b) => [b.name, b.position])).toEqual([
      ['Hook', 0],
      ['Middle', 0.5],
      ['Untitled beat', 1],
    ]);
  });

  it('falls back to a name and a blurb', () => {
    const s = structureFromEntry(entry({}, '  '));
    expect(s.name).toBe('Untitled structure');
    expect(s.bestFor).toBe('Your own stories');
    expect(s.beats).toEqual([]);
  });

  it('is found by key once loaded, and falls back when it is gone', () => {
    const s = structureFromEntry(entry({ beats: { x: { name: 'Only', position: 0.4 } } }));
    setCustomStructures([s]);
    expect(structureByKey('custom-abc').name).toBe('Braided');
    setCustomStructures([]);
    expect(structureByKey('custom-abc').key).toBe('monomyth');
    expect(customEntryId('custom-abc')).toBe('abc');
    expect(customEntryId('monomyth')).toBeNull();
  });

  it('finds the outlines that use it', () => {
    const books = [
      { id: '1', fields: { structure: 'custom-abc' } },
      { id: '2', fields: { structure: 'monomyth', overlay: 'custom-abc' } },
      { id: '3', fields: { structure: 'three-act' } },
    ] as unknown as Entry[];
    expect(outlinesUsing(books, 'custom-abc').map((b) => b.id)).toEqual(['1', '2']);
  });
});
