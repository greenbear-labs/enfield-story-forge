import type { Entry } from '../../data/types';

/**
 * Writing habits: words written each day, a daily goal, and the streak of days
 * that met it. A day's words are the net change to scene prose that day, so
 * cutting words counts against it, the way most writing apps count.
 */

/** A writing day: its local date (YYYY-MM-DD) and the net words written. */
export interface WritingDay {
  date: string;
  words: number;
}

export const DEFAULT_DAILY_GOAL = 500;

const pad = (n: number) => String(n).padStart(2, '0');

/** The local calendar date, as a sortable key. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The day before or after a key, by calendar date (safe across clock changes). */
export function shiftDay(key: string, by: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y!, m! - 1, d! + by));
}

/** With no goal set, any day with words counts. */
export const metGoal = (words: number, goal: number) => (goal > 0 ? words >= goal : words > 0);

export interface Streak {
  /** Days in a row that met the goal, ending today, or yesterday while today is still open. */
  current: number;
  best: number;
  /** Whether today has met the goal yet. */
  today: boolean;
}

export function streak(days: Map<string, number>, goal: number, today = dayKey()): Streak {
  const met = (key: string) => metGoal(days.get(key) ?? 0, goal);
  const todayMet = met(today);
  let current = 0;
  for (let key = todayMet ? today : shiftDay(today, -1); met(key); key = shiftDay(key, -1)) {
    current++;
  }
  let best = 0;
  let run = 0;
  let prev = '';
  for (const key of [...days.keys()].filter((k) => k <= today && met(k)).sort()) {
    run = prev && shiftDay(prev, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return { current, best: Math.max(best, current), today: todayMet };
}

/** The last `n` days, oldest first, with their words (0 for days with none). */
export function lastDays(days: Map<string, number>, n: number, today = dayKey()): WritingDay[] {
  return Array.from({ length: n }, (_, i) => {
    const date = shiftDay(today, i - n + 1);
    return { date, words: days.get(date) ?? 0 };
  });
}

/** A goal from a text field: a whole number of words, or 0 for none. */
export function parseGoal(text: string): number {
  const n = Math.round(Number(text.replace(/[,\s]/g, '')));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1_000_000) : 0;
}

export const percent = (part: number, whole: number) =>
  whole > 0 ? Math.max(0, Math.min(100, Math.round((part / whole) * 100))) : 0;

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** A book's word count target, kept on the book as `fields.targetWords`; 0 for none. */
export const bookTarget = (book: Entry) => {
  const t = book.fields.targetWords;
  return typeof t === 'number' && t > 0 ? t : 0;
};
