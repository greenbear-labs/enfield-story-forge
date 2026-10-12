import type { Entry, FieldValue } from '../../data/types';
import { conceptGenre, conceptLogline } from './conceptModel';
import { dealAll, fillPicks } from './generator';
import { GENERATOR_COLUMNS, type Picks } from './generatorPools';

/** The rows the Mashup compares, from studio-structure-v3.md. */
export const MASHUP_ROWS = [
  { key: 'hero', label: 'Hero' },
  { key: 'goal', label: 'Goal' },
  { key: 'world', label: 'World' },
  { key: 'conflict', label: 'Conflict' },
  { key: 'tone', label: 'Tone' },
  { key: 'hook', label: 'Hook' },
] as const;
export type RowKey = (typeof MASHUP_ROWS)[number]['key'];
export type RowValues = Record<RowKey, string>;

/** One side of the Mashup: a concept from the bank, or a random premise. */
export interface MashupSide {
  id?: string;
  title: string;
  logline: string;
  values: RowValues;
}

const str = (v: FieldValue | undefined) => (typeof v === 'string' ? v : '');

/** Conflict from the Generator's enemy and clock, e.g. "to defeat the Queen of Ash before dawn". */
function conflictFrom(parts: Record<string, FieldValue>): string {
  const enemy = str(parts.enemy);
  const clock = str(parts.clock);
  return enemy ? `to defeat ${enemy}${clock ? ` ${clock}` : ''}` : '';
}

/**
 * A concept's core elements. Concepts from the Generator or an earlier Mashup
 * have their parts stored; for a concept without parts, the logline stands in as the hook.
 */
export function rowsFromConcept(concept: Entry): RowValues {
  const raw = concept.fields.parts;
  const parts = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    hero: str(parts.hero),
    goal: str(parts.goal),
    world: str(parts.world),
    conflict: str(parts.conflict) || conflictFrom(parts),
    tone: str(parts.tone) || conceptGenre(concept),
    hook:
      str(parts.hook) ||
      str(parts.twist) ||
      (Object.keys(parts).length ? '' : conceptLogline(concept)),
  };
}

export function sideFromConcept(concept: Entry): MashupSide {
  return {
    id: concept.id,
    title: concept.title || 'Untitled concept',
    logline: conceptLogline(concept),
    values: rowsFromConcept(concept),
  };
}

const TONES = [
  'hopeful',
  'dark and tense',
  'funny',
  'eerie',
  'bittersweet',
  'epic',
  'cozy',
  'romantic',
];

/** A random premise built from the Generator's pools. */
export function randomSide(random: () => number = Math.random): MashupSide {
  const picks: Picks = fillPicks(dealAll({}, random), {}, random);
  const twists = GENERATOR_COLUMNS.find((c) => c.key === 'twist')!.options;
  return {
    title: 'Random premise',
    logline: '',
    values: {
      hero: picks.hero ?? '',
      goal: picks.goal ?? '',
      world: picks.world ?? '',
      conflict: conflictFrom(picks as Record<string, string>),
      tone: TONES[Math.floor(random() * TONES.length)]!,
      hook: twists[Math.floor(random() * twists.length)]!,
    },
  };
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'An' : 'A');

/** A first-draft logline from the chosen values. The writer edits it from there. */
export function draftLogline(v: RowValues): string {
  const hero = v.hero ? `${article(v.hero)} ${v.hero}` : 'Someone';
  let s = hero;
  if (v.goal) s += ` ${v.goal}`;
  if (v.world) s += ` in ${v.world}`;
  if (v.conflict) s += `, ${v.conflict}`;
  s += '.';
  if (v.hook && v.hook !== s) s += ` ${v.hook}`;
  return s;
}
