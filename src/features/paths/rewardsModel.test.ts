import { describe, expect, it } from 'vitest';
import { EMPTY_PLAY, type Play } from './playModel';
import {
  gemBalance,
  gemsEarned,
  gemsSpent,
  medalFor,
  medals,
  MEDALS,
  readerStats,
} from './rewardsModel';

const play = (p: Partial<Play>): Play => ({ ...EMPTY_PLAY, ...p });

const plays = new Map<string, Play>([
  [
    'pub_a',
    play({
      endings: { d: 1, t: 2, s: 3 },
      kinds: { d: 'death', t: 'true', s: 'secret' },
      unlocked: { 'p:c': 4 },
      total: 3,
    }),
  ],
  ['pub_b', play({ endings: { x: 1 }, total: 4 })],
  ['pub_c', play({ path: ['p1'] })],
  // A playtest of the writer's own draft: it doesn't count.
  ['draft1', play({ endings: { t: 1 }, kinds: { t: 'true' }, unlocked: { 'p:c': 50 } })],
]);

describe('gems', () => {
  it('earns by ending type, and an unknown type counts as 2', () => {
    expect(gemsEarned(plays)).toBe(1 + 5 + 10 + 2);
  });

  it('spends what was unlocked, never going below zero', () => {
    expect(gemsSpent(plays)).toBe(4);
    expect(gemBalance(plays)).toBe(14);
    expect(gemBalance(new Map([['pub_x', play({ unlocked: { k: 9 } })]]))).toBe(0);
  });
});

describe('medals', () => {
  it('counts what a reader has found', () => {
    expect(readerStats(plays)).toEqual({
      death: 1,
      true: 1,
      secret: 1,
      other: 1,
      finished: 2,
      completed: 1,
    });
  });

  it('gives a tier and the next step', () => {
    const def = MEDALS.find((m) => m.key === 'deaths')!;
    const r = readerStats(plays);
    const w = { built: 0, shared: 0, inLibrary: 0 };
    expect(medalFor(def, r, w)).toMatchObject({ value: 1, tier: 'Bronze', next: 5 });
    expect(medalFor(def, { ...r, death: 0 }, w)).toMatchObject({ tier: null, next: 1 });
    expect(medalFor(def, { ...r, death: 20 }, w)).toMatchObject({ tier: 'Gold', next: null });
    const writer = medals(r, { built: 3, shared: 1, inLibrary: 0 });
    expect(writer.find((m) => m.def.key === 'storyteller')).toMatchObject({ tier: 'Silver' });
    expect(writer.find((m) => m.def.key === 'library')).toMatchObject({ tier: null });
  });
});
