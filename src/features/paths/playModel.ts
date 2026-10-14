import type { Entry } from '../../data/types';
import { ENDING_TYPES, endingOf, type EndingType } from './pathsModel';

/**
 * A playthrough of an adventure, kept in the player's workspace at
 * `plays/{adventureId}`: the route taken so far (passage ids, from where the
 * run began; the last one is where the reader is now) and the endings found
 * across every run (ending passage id → when it was first found, in ms).
 * The story state isn't saved: it's worked out from the route (see
 * `stateAlong`).
 */
export interface Play {
  path: string[];
  /** The choice taken to reach each step of the path (`via[i]` was picked in `path[i - 1]`; empty for the first). */
  via: string[];
  endings: Record<string, number>;
}

/** A route this long is a reader going round in circles; the oldest steps are dropped. */
export const MAX_PATH = 300;

export const EMPTY_PLAY: Play = { path: [], via: [], endings: {} };

/** A playthrough from its stored data, ignoring anything malformed. */
export function readPlay(data: unknown): Play {
  if (!data || typeof data !== 'object') return EMPTY_PLAY;
  const raw = data as { path?: unknown; via?: unknown; endings?: unknown };
  const path = Array.isArray(raw.path)
    ? raw.path.filter((id): id is string => typeof id === 'string' && !!id)
    : [];
  const endings: Record<string, number> = {};
  if (raw.endings && typeof raw.endings === 'object' && !Array.isArray(raw.endings))
    for (const [id, at] of Object.entries(raw.endings))
      if (typeof at === 'number') endings[id] = at;
  // Older runs (or odd data) without choices line up as unknown steps.
  const rawVia = Array.isArray(raw.via) ? raw.via : [];
  const via = path.map((_, i) => (typeof rawVia[i] === 'string' ? (rawVia[i] as string) : ''));
  return { path, via, endings };
}

export type Route = Pick<Play, 'path' | 'via'>;

/** A new run that starts at `at`. */
export const beginAt = (at: string): Route => ({ path: [at], via: [''] });

/** The route after taking `choiceId` into `to`. */
export const stepTo = (route: Route, to: string, choiceId: string): Route => ({
  path: [...route.path, to].slice(-MAX_PATH),
  via: [...route.via, choiceId].slice(-MAX_PATH),
});

/** The route after going back one step (never past where the run began). */
export const stepBack = (route: Route): Route =>
  route.path.length > 1 ? { path: route.path.slice(0, -1), via: route.via.slice(0, -1) } : route;

/** Whether arriving at `passage` finds an ending this player hasn't found before. */
export const findsNewEnding = (play: Play, passage: Pick<Entry, 'id' | 'fields'>): boolean =>
  !!endingOf(passage) && !(passage.id in play.endings);

export interface EndingTally {
  type: EndingType;
  label: string;
  found: number;
  total: number;
}

/**
 * The adventure's endings, found and in all, by type (types it has none of
 * are left out). Endings found and later deleted or unmade don't count.
 */
export function endingTally(
  passages: Pick<Entry, 'id' | 'fields'>[],
  play: Play,
): { found: number; total: number; byType: EndingTally[] } {
  const byType = ENDING_TYPES.map((t) => {
    const of = passages.filter((p) => endingOf(p) === t.key);
    return {
      type: t.key,
      label: t.label,
      total: of.length,
      found: of.filter((p) => p.id in play.endings).length,
    };
  }).filter((t) => t.total > 0);
  return {
    found: byType.reduce((n, t) => n + t.found, 0),
    total: byType.reduce((n, t) => n + t.total, 0),
    byType,
  };
}

/** "1 of 3 endings found", or nothing yet to find. */
export function endingsFoundText(tally: { found: number; total: number }): string {
  if (tally.total === 0) return 'No endings yet';
  return `${tally.found} of ${tally.total} ${tally.total === 1 ? 'ending' : 'endings'} found`;
}
