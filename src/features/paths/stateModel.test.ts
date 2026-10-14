import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/types';
import {
  applyEffects,
  condText,
  effectText,
  linesOf,
  meets,
  readConds,
  startState,
  stateAlong,
  stateSummary,
  storyVars,
  unmet,
  type Cond,
  type Effect,
  type StoryVar,
} from './stateModel';

const vars: StoryVar[] = [
  { id: 'lantern', name: 'the lantern', kind: 'item', start: 0, order: 0 },
  { id: 'witch', name: 'met the witch', kind: 'flag', start: 0, order: 1 },
  { id: 'courage', name: 'Courage', kind: 'counter', start: 1, order: 2 },
];
const cond = (v: string, op: Cond['op'], value = 0): Cond => ({
  id: v,
  var: v,
  op,
  value,
  order: 0,
});
const effect = (v: string, op: Effect['op'], value = 0): Effect => ({
  id: v + op,
  var: v,
  op,
  value,
  order: 0,
});

describe('storyVars', () => {
  it('reads the story state in order, with counters keeping their start', () => {
    const adventure = {
      fields: {
        state: {
          b: { name: 'Courage', kind: 'counter', start: 3, order: 1 },
          a: { name: 'Key', kind: 'item', start: 9, order: 0 },
          c: { name: 'Odd', kind: 'mystery', order: 2 },
        },
      },
    } as unknown as Pick<Entry, 'fields'>;
    expect(storyVars(adventure).map((v) => [v.id, v.kind, v.start])).toEqual([
      ['a', 'item', 0],
      ['b', 'counter', 3],
      ['c', 'flag', 0],
    ]);
  });
});

describe('needs', () => {
  const state = { ...startState(vars), lantern: 1 };

  it('starts counters at their start and everything else at nothing', () => {
    expect(startState(vars)).toEqual({ lantern: 0, witch: 0, courage: 1 });
  });

  it('checks items, flags, and counters', () => {
    expect(meets(state, cond('lantern', 'has'), vars)).toBe(true);
    expect(meets(state, cond('lantern', 'lacks'), vars)).toBe(false);
    expect(meets(state, cond('witch', 'off'), vars)).toBe(true);
    expect(meets(state, cond('courage', 'atLeast', 2), vars)).toBe(false);
    expect(meets(state, cond('courage', 'atMost', 1), vars)).toBe(true);
    expect(meets(state, cond('courage', 'exactly', 1), vars)).toBe(true);
  });

  it('treats a need on something deleted as met', () => {
    expect(meets(state, cond('gone', 'has'), vars)).toBe(true);
  });

  it('lists the needs that are not met', () => {
    const needs = [cond('lantern', 'has'), cond('courage', 'atLeast', 3)];
    expect(unmet(state, needs, vars).map((c) => c.var)).toEqual(['courage']);
  });

  it('drops needs it cannot read', () => {
    expect(readConds({ x: { var: 'a', op: 'explode' }, y: { op: 'has' } })).toEqual([]);
  });
});

describe('changes', () => {
  it('gains, loses, turns on, adds, and sets', () => {
    const next = applyEffects(
      startState(vars),
      [effect('lantern', 'gain'), effect('witch', 'on'), effect('courage', 'add', 2)],
      vars,
    );
    expect(next).toEqual({ lantern: 1, witch: 1, courage: 3 });
    expect(
      applyEffects(next, [effect('lantern', 'lose'), effect('courage', 'set', 0)], vars),
    ).toMatchObject({ lantern: 0, courage: 0 });
  });

  it('works out the state from the route', () => {
    const passages = new Map<string, Pick<Entry, 'fields'>>([
      ['a', { fields: {} }],
      ['b', { fields: {} }],
      ['c', { fields: {} }],
    ]);
    const made: Record<string, Effect[]> = {
      take: [effect('lantern', 'gain')],
      brave: [effect('courage', 'add', 1)],
    };
    const state = stateAlong(
      ['a', 'b', 'c'],
      ['', 'take', 'brave'],
      passages,
      vars,
      (_, id) => made[id] ?? [],
    );
    expect(state).toEqual({ lantern: 1, witch: 0, courage: 2 });
  });
});

describe('words', () => {
  it('says needs and changes plainly', () => {
    expect(condText(cond('lantern', 'has'), vars)).toBe('has the lantern');
    expect(condText(cond('courage', 'atLeast', 2), vars)).toBe('Courage is at least 2');
    expect(effectText(effect('courage', 'add', -1), vars)).toBe('Courage −1');
    expect(effectText(effect('witch', 'on'), vars)).toBe('turn on met the witch');
  });

  it('sums up what the reader carries', () => {
    expect(stateSummary({ lantern: 1, witch: 0, courage: 4 }, vars)).toEqual({
      items: ['the lantern'],
      flags: [],
      counters: [{ name: 'Courage', value: 4 }],
    });
  });
});

describe('linesOf', () => {
  it('reads lines that show only sometimes, in order', () => {
    const passage = {
      fields: {
        lines: {
          two: { text: 'The witch nods.', when: { var: 'witch', op: 'on' }, order: 1 },
          one: { text: 'Your lantern hisses.', when: { var: 'lantern', op: 'has' }, order: 0 },
        },
      },
    } as unknown as Pick<Entry, 'fields'>;
    expect(linesOf(passage).map((l) => [l.text, l.when?.var])).toEqual([
      ['Your lantern hisses.', 'lantern'],
      ['The witch nods.', 'witch'],
    ]);
  });
});
