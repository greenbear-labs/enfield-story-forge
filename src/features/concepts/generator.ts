import { GENERATOR_COLUMNS, type ColumnKey, type Picks } from './generatorPools';

/** How many options each column shows at a time. */
export const VISIBLE_OPTIONS = 6;

type Random = () => number;

/** `count` different options from a pool, in random order. Keeps `keep` if given. */
export function sample(
  pool: readonly string[],
  count: number,
  random: Random = Math.random,
  keep?: string,
) {
  const rest = pool.filter((o) => o !== keep);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  const picked = rest.slice(0, keep ? count - 1 : count);
  return keep ? [keep, ...picked] : picked;
}

export type Shown = Record<ColumnKey, string[]>;

/** Deal a fresh set of options for every column, keeping each column's pick visible. */
export function dealAll(picks: Picks = {}, random: Random = Math.random): Shown {
  return Object.fromEntries(
    GENERATOR_COLUMNS.map((c) => [c.key, sample(c.options, VISIBLE_OPTIONS, random, picks[c.key])]),
  ) as Shown;
}

/** Fills every required column that has no pick yet from its shown options. Picks stay. */
export function fillPicks(shown: Shown, current: Picks, random: Random = Math.random): Picks {
  const picks: Picks = { ...current };
  for (const c of GENERATOR_COLUMNS) {
    if (picks[c.key] || ('optional' in c && c.optional)) continue;
    const options = shown[c.key];
    picks[c.key] = options[Math.floor(random() * options.length)];
  }
  return picks;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'An' : 'A');

/** The concept sentence. Blanks show as "…" so the shape is visible while building. */
export function conceptSentence(picks: Picks): string {
  const p = (k: ColumnKey) => picks[k] ?? '…';
  const hero = picks.hero ? `${article(picks.hero)} ${picks.hero}` : 'A …';
  const main = `${hero} ${p('goal')} in ${p('world')}, and must team up with ${p('ally')} to defeat ${p('enemy')} ${p('clock')}.`;
  return picks.twist ? `${main} ${picks.twist}` : main;
}

/** True when every required column has a pick. */
export function isComplete(picks: Picks): boolean {
  return GENERATOR_COLUMNS.every((c) => ('optional' in c && c.optional) || !!picks[c.key]);
}
