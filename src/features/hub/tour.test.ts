import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { TOUR, tourDone } from './tour';

describe('the welcome tour', () => {
  it('counts a step done once there is something to show for it', () => {
    expect(tourDone([])).toBe(0);
    const entries = [
      fakeShard('A lighthouse'),
      fakeShard('', { type: 'character', title: 'Mira' }),
      fakeShard('', { type: 'scene', title: 'Empty scene', wordCount: 0 }),
    ];
    expect(TOUR.filter((s) => s.done(entries)).map((s) => s.key)).toEqual(['shard', 'char']);
    entries.push(fakeShard('', { type: 'scene', title: 'Written', wordCount: 120 }));
    expect(tourDone(entries)).toBe(3);
  });
});
