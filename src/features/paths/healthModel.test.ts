import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/types';
import { canEverMeet, distancesFrom, storyHealth } from './healthModel';
import type { Cond, Effect, StoryVar } from './stateModel';

type P = Pick<Entry, 'id' | 'title' | 'fields'>;
const passage = (
  id: string,
  choices: Record<string, { to: string; label?: string; requires?: object; effects?: object }> = {},
  ending?: string,
): P => ({
  id,
  title: id,
  fields: {
    choices: Object.fromEntries(
      Object.entries(choices).map(([cid, c], order) => [cid, { label: '', ...c, order }]),
    ),
    ...(ending ? { ending } : {}),
  } as P['fields'],
});
const adventure = (startId: string | null, state: object = {}) =>
  ({ fields: { startId, state } }) as Pick<Entry, 'fields'>;

describe('distancesFrom', () => {
  it('counts steps from the start, ignoring missing targets', () => {
    const ps = [
      passage('a', { x: { to: 'b' }, y: { to: 'gone' } }),
      passage('b', { z: { to: 'a' } }),
    ];
    const d = distancesFrom('a', new Map(ps.map((p) => [p.id, p])));
    expect([...d]).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
  });
});

describe('storyHealth', () => {
  it('finds a healthy story healthy', () => {
    const h = storyHealth(adventure('a'), [
      passage('a', { x: { to: 'b' }, y: { to: 'c' } }),
      passage('b', { z: { to: 'c' } }),
      passage('c', {}, 'true'),
    ]);
    expect(h.issues).toEqual([]);
    expect(h.quickest).toBe(2);
    expect(h.farthest).toBe(2);
    expect(h.endings).toEqual([{ type: 'true', label: 'True ending', count: 1, reachable: 1 }]);
  });

  it('flags a missing start and a story with no endings', () => {
    const kinds = storyHealth(adventure(null), [passage('a')]).issues.map((i) => i.kind);
    expect(kinds).toContain('no-start');
    expect(kinds).toContain('no-endings');
  });

  it('flags unreachable passages, dead ends, and choices that go nowhere', () => {
    const h = storyHealth(adventure('a'), [
      passage('a', { x: { to: '' }, y: { to: 'gone' }, z: { to: 'b' } }),
      passage('b'),
      passage('lost', {}, 'death'),
    ]);
    expect(h.issues.map((i) => [i.kind, i.passageId])).toEqual([
      ['undecided', 'a'],
      ['broken', 'a'],
      ['dead-end', 'b'],
      ['unreachable', 'lost'],
    ]);
    expect(h.issues.find((i) => i.kind === 'unreachable')?.text).toContain('ending');
    expect(h.quickest).toBeNull();
  });

  it('flags a choice that needs something no choice ever gives', () => {
    const h = storyHealth(adventure('a', { key: { name: 'the key', kind: 'item', order: 0 } }), [
      passage('a', {
        x: { to: 'b', label: 'Unlock the door', requires: { r: { var: 'key', op: 'has' } } },
      }),
      passage('b', {}, 'true'),
    ]);
    expect(h.issues.map((i) => i.kind)).toEqual(['never-open']);
    expect(h.issues[0]!.text).toContain('“Unlock the door”');
    expect(h.issues[0]!.text).toContain('has the key');
  });
});

describe('canEverMeet', () => {
  const vars: StoryVar[] = [
    { id: 'c', name: 'Courage', kind: 'counter', start: 1, order: 0 },
    { id: 'k', name: 'key', kind: 'item', start: 0, order: 1 },
  ];
  const need = (v: string, op: Cond['op'], value = 0): Cond => ({
    id: 'n',
    var: v,
    op,
    value,
    order: 0,
  });
  const fx = (v: string, op: Effect['op'], value = 0): Effect => ({
    id: 'e',
    var: v,
    op,
    value,
    order: 0,
  });

  it('knows what the start already meets', () => {
    expect(canEverMeet(need('c', 'atLeast', 1), vars, [])).toBe(true);
    expect(canEverMeet(need('k', 'lacks'), vars, [])).toBe(true);
    expect(canEverMeet(need('c', 'atLeast', 3), vars, [])).toBe(false);
  });

  it('looks for a change that could make it true', () => {
    expect(canEverMeet(need('c', 'atLeast', 3), vars, [fx('c', 'add', 1)])).toBe(true);
    expect(canEverMeet(need('c', 'atMost', 0), vars, [fx('c', 'add', 1)])).toBe(false);
    expect(canEverMeet(need('k', 'has'), vars, [fx('k', 'gain')])).toBe(true);
  });
});
