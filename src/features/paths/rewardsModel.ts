import type { EndingType } from './pathsModel';
import type { Play } from './playModel';

/**
 * Rewards, worked out from the reader's playthroughs rather than stored, so
 * they can't drift from what was actually played. Gems are earned the first
 * time a reader finds each ending of a published story, and spent unlocking
 * choices that cost gems. Medals mark how far a reader (and writer) has come.
 * Playtests of your own drafts don't count.
 */

/** Gems for finding an ending, by its type. */
export const GEMS_FOR: Record<EndingType, number> = { death: 1, other: 2, true: 5, secret: 10 };
/** Endings found before their type was kept. */
const GEMS_FOR_UNKNOWN = 2;

/** A reader's playthrough of a published story (not a playtest). */
export const isReaderPlay = (playId: string) => playId.startsWith('pub_');

export const gemsForEnding = (kind: EndingType | undefined) =>
  kind ? GEMS_FOR[kind] : GEMS_FOR_UNKNOWN;

const readerPlays = (plays: Map<string, Play>) =>
  [...plays].filter(([id]) => isReaderPlay(id)).map(([, play]) => play);

export function gemsEarned(plays: Map<string, Play>): number {
  let gems = 0;
  for (const play of readerPlays(plays))
    for (const id of Object.keys(play.endings)) gems += gemsForEnding(play.kinds[id]);
  return gems;
}

export function gemsSpent(plays: Map<string, Play>): number {
  let gems = 0;
  for (const play of readerPlays(plays))
    for (const cost of Object.values(play.unlocked)) gems += cost;
  return gems;
}

/** Gems to spend now (never below zero, even after forgetting endings found). */
export const gemBalance = (plays: Map<string, Play>) =>
  Math.max(0, gemsEarned(plays) - gemsSpent(plays));

export const gemsText = (n: number) => `${n} ${n === 1 ? 'gem' : 'gems'}`;

export interface ReaderStats {
  /** Endings found, by type. */
  death: number;
  true: number;
  secret: number;
  other: number;
  /** Stories with at least one ending found. */
  finished: number;
  /** Stories with every ending found. */
  completed: number;
}

export function readerStats(plays: Map<string, Play>): ReaderStats {
  const stats: ReaderStats = { death: 0, true: 0, secret: 0, other: 0, finished: 0, completed: 0 };
  for (const play of readerPlays(plays)) {
    const found = Object.keys(play.endings);
    for (const id of found) stats[play.kinds[id] ?? 'other'] += 1;
    if (found.length > 0) stats.finished += 1;
    if (play.total > 0 && found.length >= play.total) stats.completed += 1;
  }
  return stats;
}

export interface WriterStats {
  /** Adventures written. */
  built: number;
  /** Stories shared with a link or in the library. */
  shared: number;
  /** Stories in the library. */
  inLibrary: number;
}

export const TIERS = ['Bronze', 'Silver', 'Gold'] as const;
export type Tier = (typeof TIERS)[number];

export interface MedalDef {
  key: string;
  name: string;
  /** What it's for, e.g. "Deaths found". */
  counts: string;
  /** How many for bronze, silver, gold. */
  steps: [number, number, number];
  value: (r: ReaderStats, w: WriterStats) => number;
  /** A reader's medal or a writer's trophy. */
  side: 'reader' | 'writer';
}

export const MEDALS: MedalDef[] = [
  {
    key: 'deaths',
    name: 'Grim Reaper',
    counts: 'Deaths found',
    steps: [1, 5, 15],
    value: (r) => r.death,
    side: 'reader',
  },
  {
    key: 'true',
    name: 'True Heart',
    counts: 'True endings found',
    steps: [1, 3, 10],
    value: (r) => r.true,
    side: 'reader',
  },
  {
    key: 'secret',
    name: 'Secret Keeper',
    counts: 'Secret endings found',
    steps: [1, 3, 10],
    value: (r) => r.secret,
    side: 'reader',
  },
  {
    key: 'wanderer',
    name: 'Wanderer',
    counts: 'Stories finished',
    steps: [1, 3, 10],
    value: (r) => r.finished,
    side: 'reader',
  },
  {
    key: 'completionist',
    name: 'Completionist',
    counts: 'Stories with every ending found',
    steps: [1, 3, 5],
    value: (r) => r.completed,
    side: 'reader',
  },
  {
    key: 'storyteller',
    name: 'Storyteller',
    counts: 'Adventures written',
    steps: [1, 3, 10],
    value: (_, w) => w.built,
    side: 'writer',
  },
  {
    key: 'shared',
    name: 'Lamplighter',
    counts: 'Stories shared',
    steps: [1, 3, 10],
    value: (_, w) => w.shared,
    side: 'writer',
  },
  {
    key: 'library',
    name: 'Shelved',
    counts: 'Stories in the library',
    steps: [1, 3, 5],
    value: (_, w) => w.inLibrary,
    side: 'writer',
  },
];

export interface Medal {
  def: MedalDef;
  value: number;
  /** The tier reached, or null if none yet. */
  tier: Tier | null;
  /** How many for the next tier, or null at gold. */
  next: number | null;
}

export function medalFor(def: MedalDef, r: ReaderStats, w: WriterStats): Medal {
  const value = def.value(r, w);
  const reached = def.steps.filter((s) => value >= s).length;
  return {
    def,
    value,
    tier: reached > 0 ? TIERS[reached - 1]! : null,
    next: reached < def.steps.length ? def.steps[reached]! : null,
  };
}

export const medals = (r: ReaderStats, w: WriterStats): Medal[] =>
  MEDALS.map((def) => medalFor(def, r, w));
