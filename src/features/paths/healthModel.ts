import type { Entry } from '../../data/types';
import {
  choicesOf,
  ENDING_TYPES,
  endingOf,
  passageName,
  startIdOf,
  type Choice,
  type EndingType,
} from './pathsModel';
import { condText, storyVars, type Cond, type Effect, type StoryVar } from './stateModel';

/**
 * Story health for an adventure: the shape checks a branching story needs
 * (where it starts, passages nobody reaches, dead ends, choices that go
 * nowhere or can never be taken) and a few numbers about its routes.
 */

export type IssueKind =
  'no-start' | 'no-endings' | 'unreachable' | 'dead-end' | 'undecided' | 'broken' | 'never-open';

export interface Issue {
  kind: IssueKind;
  /** The passage to open to fix it, if there is one. */
  passageId: string | null;
  text: string;
}

export interface Health {
  issues: Issue[];
  passages: number;
  reachable: number;
  endings: { type: EndingType; label: string; count: number; reachable: number }[];
  /** Passages read on the shortest way to the nearest and the farthest reachable ending. */
  quickest: number | null;
  farthest: number | null;
}

/** Passages in steps from the start, following every choice (needs aside). */
export function distancesFrom(
  startId: string | null,
  byId: Map<string, Pick<Entry, 'fields'>>,
): Map<string, number> {
  const dist = new Map<string, number>();
  if (!startId || !byId.has(startId)) return dist;
  dist.set(startId, 0);
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const c of choicesOf(byId.get(id)!))
      if (c.to && byId.has(c.to) && !dist.has(c.to)) {
        dist.set(c.to, dist.get(id)! + 1);
        queue.push(c.to);
      }
  }
  return dist;
}

/**
 * Whether some choice in the story could ever make this need true. Needs
 * that are already true at the start (no lantern, courage at most 5) are
 * fine as they are.
 */
export function canEverMeet(cond: Cond, vars: StoryVar[], effects: Effect[]): boolean {
  const v = vars.find((x) => x.id === cond.var);
  if (!v) return true;
  const on = effects.filter((e) => e.var === v.id);
  switch (cond.op) {
    case 'has':
      return on.some((e) => e.op === 'gain');
    case 'on':
      return on.some((e) => e.op === 'on');
    case 'lacks':
    case 'off':
      return true;
    case 'atLeast':
      return (
        v.start >= cond.value ||
        on.some((e) => (e.op === 'add' && e.value > 0) || (e.op === 'set' && e.value >= cond.value))
      );
    case 'atMost':
      return (
        v.start <= cond.value ||
        on.some((e) => (e.op === 'add' && e.value < 0) || (e.op === 'set' && e.value <= cond.value))
      );
    case 'exactly':
      return (
        v.start === cond.value ||
        on.some(
          (e) => (e.op === 'add' && e.value !== 0) || (e.op === 'set' && e.value === cond.value),
        )
      );
  }
}

const label = (c: Choice) => (c.label.trim() ? `“${c.label.trim()}”` : 'A choice');

export function storyHealth(
  adventure: Pick<Entry, 'fields'>,
  passages: Pick<Entry, 'id' | 'title' | 'fields'>[],
): Health {
  const byId = new Map(passages.map((p) => [p.id, p]));
  const startId = startIdOf(adventure);
  const vars = storyVars(adventure);
  const dist = distancesFrom(startId, byId);
  const allEffects = passages.flatMap((p) => choicesOf(p).flatMap((c) => c.effects));
  const issues: Issue[] = [];

  if (passages.length > 0 && (!startId || !byId.has(startId)))
    issues.push({
      kind: 'no-start',
      passageId: null,
      text: 'The story has no first passage. Open one and choose “Start the story here”.',
    });
  if (passages.length > 0 && !passages.some((p) => endingOf(p)))
    issues.push({
      kind: 'no-endings',
      passageId: null,
      text: 'No passage is an ending yet, so no run can finish.',
    });

  for (const p of passages) {
    const name = passageName(p);
    const ending = endingOf(p);
    const choices = choicesOf(p);
    if (dist.size > 0 && !dist.has(p.id))
      issues.push({
        kind: 'unreachable',
        passageId: p.id,
        text: ending
          ? `Nobody can reach the ending “${name}”: no choice leads there from the start.`
          : `Nobody can reach “${name}”: no choice leads there from the start.`,
      });
    if (!ending && choices.length === 0)
      issues.push({
        kind: 'dead-end',
        passageId: p.id,
        text: `“${name}” is a dead end: no choices, and it isn’t an ending.`,
      });
    for (const c of choices) {
      if (!c.to)
        issues.push({
          kind: 'undecided',
          passageId: p.id,
          text: `${label(c)} in “${name}” doesn’t lead anywhere yet.`,
        });
      else if (!byId.has(c.to))
        issues.push({
          kind: 'broken',
          passageId: p.id,
          text: `${label(c)} in “${name}” leads to a passage that was deleted.`,
        });
      for (const need of c.requires)
        if (!canEverMeet(need, vars, allEffects))
          issues.push({
            kind: 'never-open',
            passageId: p.id,
            text: `${label(c)} in “${name}” can never be taken: it needs “${condText(need, vars)}”, and no choice makes that happen.`,
          });
    }
  }

  const reachableEndings = passages.filter((p) => endingOf(p) && dist.has(p.id));
  const steps = reachableEndings.map((p) => dist.get(p.id)! + 1);
  return {
    issues,
    passages: passages.length,
    reachable: dist.size,
    endings: ENDING_TYPES.map((t) => {
      const of = passages.filter((p) => endingOf(p) === t.key);
      return {
        type: t.key,
        label: t.label,
        count: of.length,
        reachable: of.filter((p) => dist.has(p.id)).length,
      };
    }).filter((e) => e.count > 0),
    quickest: steps.length ? Math.min(...steps) : null,
    farthest: steps.length ? Math.max(...steps) : null,
  };
}
