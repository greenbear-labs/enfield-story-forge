import { describe, expect, it } from 'vitest';
import {
  adventureBlurb,
  adventureCategories,
  choicesInto,
  choicesOf,
  endingOf,
  freeSpot,
  nextChoiceOrder,
  posOf,
  startIdOf,
  storyOrder,
  toggleCategory,
} from './pathsModel';

describe('adventureCategories', () => {
  it('keeps known categories in library order', () => {
    expect(adventureCategories({ fields: { categories: ['Horror', 'Nope', 'Fantasy'] } })).toEqual([
      'Fantasy',
      'Horror',
    ]);
  });

  it('is empty when the field is missing or not a list', () => {
    expect(adventureCategories({ fields: {} })).toEqual([]);
    expect(adventureCategories({ fields: { categories: 'Horror' } })).toEqual([]);
  });
});

describe('toggleCategory', () => {
  it('adds a category in library order', () => {
    expect(toggleCategory(['Horror'], 'Adventure')).toEqual(['Adventure', 'Horror']);
  });

  it('removes a category that is already there', () => {
    expect(toggleCategory(['Adventure', 'Horror'], 'Horror')).toEqual(['Adventure']);
  });
});

describe('adventureBlurb', () => {
  it('reads the blurb, or nothing', () => {
    expect(adventureBlurb({ fields: { blurb: 'Lost in the Ashwood.' } })).toBe(
      'Lost in the Ashwood.',
    );
    expect(adventureBlurb({ fields: {} })).toBe('');
  });
});

const passage = (id: string, choices: Record<string, unknown> = {}, order = id) => ({
  id,
  order,
  fields: { choices } as never,
});

describe('choicesOf', () => {
  it('reads choices in order, with an empty target as undecided', () => {
    expect(
      choicesOf({
        fields: {
          choices: {
            b: { label: 'Run', to: 'p2', order: 1 },
            a: { label: 'Hide', to: '', order: 0 },
          },
        },
      }),
    ).toEqual([
      { id: 'a', label: 'Hide', to: null, order: 0 },
      { id: 'b', label: 'Run', to: 'p2', order: 1 },
    ]);
  });

  it('is empty without choices', () => {
    expect(choicesOf({ fields: {} })).toEqual([]);
  });

  it('gives the next order after the last choice', () => {
    expect(nextChoiceOrder([])).toBe(0);
    expect(nextChoiceOrder(choicesOf({ fields: { choices: { a: { order: 4 } } } }))).toBe(5);
  });
});

describe('passage fields', () => {
  it('reads an ending type, ignoring unknown ones', () => {
    expect(endingOf({ fields: { ending: 'death' } })).toBe('death');
    expect(endingOf({ fields: { ending: 'nope' } })).toBeNull();
    expect(endingOf({ fields: {} })).toBeNull();
  });

  it('reads a map position, defaulting to the origin', () => {
    expect(posOf({ fields: { pos: { x: 10, y: -4 } } })).toEqual({ x: 10, y: -4 });
    expect(posOf({ fields: {} })).toEqual({ x: 0, y: 0 });
  });

  it('reads the start passage', () => {
    expect(startIdOf({ fields: { startId: 'p1' } })).toBe('p1');
    expect(startIdOf({ fields: { startId: '' } })).toBeNull();
  });
});

describe('storyOrder', () => {
  const passages = [
    passage('d', {}, '4'),
    passage('c', {}, '3'),
    passage('b', { x: { to: 'c', order: 0 } }, '2'),
    passage('a', { x: { to: 'b', order: 0 }, y: { to: 'a', order: 1 } }, '1'),
  ];

  it('follows choices from the start, then lists the unreachable ones', () => {
    expect(storyOrder(passages, 'a').map((r) => [r.passage.id, r.reachable])).toEqual([
      ['a', true],
      ['b', true],
      ['c', true],
      ['d', false],
    ]);
  });

  it('lists everything as unreachable without a start', () => {
    expect(storyOrder(passages, null).map((r) => r.passage.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('choicesInto', () => {
  it('finds the choices that lead to a passage', () => {
    const passages = [passage('a', { x: { to: 'c' } }), passage('b', { y: { to: 'c' } })];
    expect(choicesInto(passages, 'c').map((r) => [r.from.id, r.choice.id])).toEqual([
      ['a', 'x'],
      ['b', 'y'],
    ]);
  });
});

describe('freeSpot', () => {
  const at = (x: number, y: number) => ({ fields: { pos: { x, y } } });

  it('keeps the spot when nothing is there', () => {
    expect(freeSpot([at(0, 0)], { x: 500, y: 0 })).toEqual({ x: 500, y: 0 });
  });

  it('moves down past cards in the way', () => {
    expect(freeSpot([at(0, 0), at(10, 120)], { x: 5, y: 20 })).toEqual({ x: 5, y: 240 });
  });
});
