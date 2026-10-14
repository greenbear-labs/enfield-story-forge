import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { storyHealth } from './healthModel';
import { chaptersOf, linePos, outlineBlurb, outlineSteps, stepFields } from './outlineAdventure';

const outline = fakeShard('', {
  id: 'book1',
  type: 'book',
  title: 'The Long Way',
  fields: {
    structure: 'story-circle',
    spine: { logline: '  A courier carries a letter that rewrites the road. ' },
    beatNotes: { 'story-circle': { you: 'Mara knows every road.\n\nExcept one.' } },
  },
});
const chapter = (id: string, title: string, order: string) =>
  fakeShard('', { id, type: 'chapter', title, order, parentId: 'book1' });
const chapters = [
  chapter('c2', 'The Fork', '2'),
  chapter('c1', '', '1'),
  fakeShard('', { id: 'cx', type: 'chapter', title: 'Elsewhere', parentId: 'book2' }),
];
const scenes = [
  fakeShard('', { id: 's2', type: 'scene', title: 'At the inn', order: '2', parentId: 'c1' }),
  fakeShard('', { id: 's1', type: 'scene', title: '', order: '1', parentId: 'c1' }),
];

describe('outlineSteps', () => {
  it('makes a step for each beat, with its note as prose and its question as a note', () => {
    const steps = outlineSteps(outline, 'beats', chapters, scenes);
    expect(steps).toHaveLength(8);
    expect(steps[0]).toMatchObject({ text: ['Mara knows every road.', 'Except one.'] });
    expect(steps[0]!.notes).toBeTruthy();
    expect(steps[1]!.text).toEqual([]);
  });

  it('makes a step for each chapter, in order, listing its scenes', () => {
    expect(chaptersOf(outline, chapters).map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(outlineSteps(outline, 'chapters', chapters, scenes)).toEqual([
      { title: 'Chapter 1', text: [], notes: '• Untitled scene\n• At the inn' },
      { title: 'The Fork', text: [], notes: '' },
    ]);
  });

  it('starts the blurb from the logline', () => {
    expect(outlineBlurb(outline)).toBe('A courier carries a letter that rewrites the road.');
  });
});

describe('stepFields', () => {
  it('links each passage to the next and ends on the last, making a healthy story', () => {
    const steps = outlineSteps(outline, 'beats', chapters, scenes);
    const ids = steps.map((_, i) => `p${i}`);
    const passages = steps.map((s, i) => ({
      id: ids[i]!,
      title: s.title,
      fields: stepFields(steps, i, ids[i + 1] ?? null),
    }));
    expect(passages[0]!.fields.choices).toEqual({
      c1: { label: 'Go on', to: 'p1', order: 0, requires: {}, effects: {} },
    });
    expect(passages.at(-1)!.fields).toMatchObject({ ending: 'true' });
    expect(passages.at(-1)!.fields.choices).toBeUndefined();
    expect(storyHealth({ fields: { startId: 'p0' } }, passages).issues).toEqual([]);
  });

  it('lays the line out in rows of six', () => {
    expect(linePos(0)).toEqual({ x: 0, y: 0 });
    expect(linePos(5)).toEqual({ x: 1500, y: 0 });
    expect(linePos(6)).toEqual({ x: 0, y: 220 });
  });
});
