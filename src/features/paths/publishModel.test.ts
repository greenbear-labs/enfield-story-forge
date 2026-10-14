import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/types';
import {
  chunk,
  newestFirst,
  passageData,
  readPassage,
  readStory,
  storyData,
  storyFields,
} from './publishModel';

const adventure = {
  title: '  The Hollow  ',
  fields: {
    blurb: 'A door in the hill.',
    categories: ['Horror', 'Nonsense', 'Adventure'],
    startId: 'p1',
    state: { lantern: { name: 'the lantern', kind: 'item', start: 0, order: 0 } },
    notes: 'private',
  },
};
const passages: Pick<Entry, 'fields'>[] = [
  { fields: { ending: 'true' } },
  { fields: { ending: 'death' } },
  { fields: {} },
];

describe('storyData', () => {
  it('copies what readers need, with known categories in library order', () => {
    const data = storyData(adventure, passages, { uid: 'u1', name: 'Alex' }, 'unlisted', null);
    expect(data).toEqual({
      ownerId: 'u1',
      ownerName: 'Alex',
      title: 'The Hollow',
      blurb: 'A door in the hill.',
      categories: ['Adventure', 'Horror'],
      coverUrl: null,
      startId: 'p1',
      state: adventure.fields.state,
      status: 'unlisted',
      passageCount: 3,
      endingCount: 2,
    });
  });

  it('names a writer with no name', () => {
    const data = storyData(adventure, [], { uid: 'u1', name: '  ' }, 'submitted', null);
    expect(data.ownerName).toBe('A Shadow Paths writer');
  });
});

describe('passageData', () => {
  it('keeps choices, lines, and the ending, and drops notes and the map', () => {
    const passage = {
      title: 'The door',
      fields: {
        choices: { c1: { label: 'Knock', to: 'p2', order: 0 } },
        lines: { l1: { text: 'It hums.', order: 0 } },
        ending: 'secret',
        notes: 'Secret plans',
        pos: { x: 1, y: 2 },
      },
    };
    const doc = { type: 'doc', content: [] };
    expect(passageData(passage, doc, 'https://img')).toEqual({
      title: 'The door',
      fields: {
        choices: passage.fields.choices,
        lines: passage.fields.lines,
        ending: 'secret',
      },
      doc,
      imageUrl: 'https://img',
    });
    expect(passageData({ title: '', fields: { ending: null } }, undefined, null)).toEqual({
      title: '',
      fields: {},
      doc: null,
      imageUrl: null,
    });
  });
});

describe('reading', () => {
  it('reads a story, ignoring odd values', () => {
    const story = readStory('s1', {
      ownerId: 'u1',
      title: 'T',
      categories: ['Horror', 3],
      status: 'bogus',
      startId: '',
      publishedAt: { toMillis: () => 5 },
    });
    expect(story).toMatchObject({
      id: 's1',
      categories: ['Horror'],
      status: 'private',
      startId: null,
      coverUrl: null,
      publishedAt: 5,
      updatedAt: null,
      passageCount: 0,
    });
    expect(storyFields(story)).toEqual({ state: {} });
    expect(storyFields({ ...story, startId: 'p1' })).toEqual({ startId: 'p1', state: {} });
  });

  it('reads a passage', () => {
    expect(readPassage('p1', { title: 'A', fields: { ending: 'true' } })).toEqual({
      id: 'p1',
      title: 'A',
      fields: { ending: 'true' },
      doc: null,
      imageUrl: null,
    });
  });
});

describe('helpers', () => {
  it('sorts newest first, with ones still saving at the top', () => {
    const s = (title: string, publishedAt: number | null) =>
      readStory(title, { title, publishedAt: publishedAt && { toMillis: () => publishedAt } });
    const sorted = [s('old', 1), s('pending', null), s('new', 9)].sort(newestFirst);
    expect(sorted.map((x) => x.title)).toEqual(['pending', 'new', 'old']);
  });

  it('chunks writes', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
