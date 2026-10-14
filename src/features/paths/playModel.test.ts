import type { Entry } from '../../data/types';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_PLAY,
  MAX_PATH,
  endingTally,
  endingsFoundText,
  findsNewEnding,
  readPlay,
  stepBack,
  stepTo,
} from './playModel';

const passage = (id: string, ending?: string): Pick<Entry, 'id' | 'fields'> => ({
  id,
  fields: ending ? { ending } : {},
});

describe('readPlay', () => {
  it('reads a stored playthrough and drops what it does not understand', () => {
    expect(
      readPlay({ path: ['a', 3, '', 'b'], endings: { e1: 100, e2: 'soon' }, extra: true }),
    ).toEqual({ path: ['a', 'b'], endings: { e1: 100 } });
  });

  it('treats a missing or odd document as a fresh start', () => {
    expect(readPlay(undefined)).toEqual(EMPTY_PLAY);
    expect(readPlay({ path: 'a', endings: [] })).toEqual(EMPTY_PLAY);
  });
});

describe('stepping through a story', () => {
  it('adds the next passage to the route', () => {
    expect(stepTo(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('keeps only the latest steps of a very long route', () => {
    const long = Array.from({ length: MAX_PATH }, (_, i) => `p${i}`);
    const next = stepTo(long, 'last');
    expect(next).toHaveLength(MAX_PATH);
    expect(next.at(-1)).toBe('last');
    expect(next[0]).toBe('p1');
  });

  it('goes back a step, but never past the start of the run', () => {
    expect(stepBack(['a', 'b'])).toEqual(['a']);
    expect(stepBack(['a'])).toEqual(['a']);
  });
});

describe('endings', () => {
  it('knows when an ending is found for the first time', () => {
    const play = { path: [], endings: { old: 1 } };
    expect(findsNewEnding(play, passage('new', 'death'))).toBe(true);
    expect(findsNewEnding(play, passage('old', 'death'))).toBe(false);
    expect(findsNewEnding(play, passage('plain'))).toBe(false);
  });

  it('tallies endings found by type, skipping types the story lacks', () => {
    const passages = [
      passage('a'),
      passage('t1', 'true'),
      passage('d1', 'death'),
      passage('d2', 'death'),
    ];
    const tally = endingTally(passages, { path: [], endings: { d1: 1, gone: 2 } });
    expect(tally.found).toBe(1);
    expect(tally.total).toBe(3);
    expect(tally.byType.map((t) => [t.type, t.found, t.total])).toEqual([
      ['true', 0, 1],
      ['death', 1, 2],
    ]);
  });

  it('says how many endings are found', () => {
    expect(endingsFoundText({ found: 0, total: 0 })).toBe('No endings yet');
    expect(endingsFoundText({ found: 1, total: 1 })).toBe('1 of 1 ending found');
    expect(endingsFoundText({ found: 2, total: 5 })).toBe('2 of 5 endings found');
  });
});
