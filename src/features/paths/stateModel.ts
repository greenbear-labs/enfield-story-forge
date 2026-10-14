import type { Entry, FieldValue } from '../../data/types';
import { removedField, updateEntry } from '../../lib/entries/entries';

/**
 * Story state: a few things an adventure keeps track of while it's played.
 * The author defines them on the adventure as `fields.state`, keyed by id:
 * `{name, kind, start, order}`.
 *
 * - an **item** the reader has or hasn't got (the lantern)
 * - a **flag** that is on or off (met the witch)
 * - a **counter**, a number (courage), starting at `start`
 *
 * A choice can **need** things (`requires`: has the lantern, courage at
 * least 2) and **change** things (`effects`: gain the lantern, courage +1),
 * each kept on the choice keyed by id: `{var, op, value, order}`. A passage
 * can have lines that only show when something is true (`fields.lines`,
 * keyed by id: `{text, when, order}`). No scripting: just these.
 *
 * While playing, every value is a number (items and flags are 1 or 0).
 */

export const VAR_KINDS = [
  { key: 'item', label: 'Item', blurb: 'Something the reader carries: a lantern, a key' },
  { key: 'flag', label: 'Flag', blurb: 'Something that happened, or didn’t: met the witch' },
  { key: 'counter', label: 'Counter', blurb: 'A number: courage, coins, days left' },
] as const;
export type VarKind = (typeof VAR_KINDS)[number]['key'];

export interface StoryVar {
  id: string;
  name: string;
  kind: VarKind;
  /** A counter's starting value (items and flags start without / off). */
  start: number;
  order: number;
}

export const COND_OPS = {
  item: [
    { key: 'has', label: 'has' },
    { key: 'lacks', label: 'doesn’t have' },
  ],
  flag: [
    { key: 'on', label: 'is on' },
    { key: 'off', label: 'is off' },
  ],
  counter: [
    { key: 'atLeast', label: 'is at least' },
    { key: 'atMost', label: 'is at most' },
    { key: 'exactly', label: 'is exactly' },
  ],
} as const;
export type CondOp = (typeof COND_OPS)[VarKind][number]['key'];

export const EFFECT_OPS = {
  item: [
    { key: 'gain', label: 'gain' },
    { key: 'lose', label: 'lose' },
  ],
  flag: [
    { key: 'on', label: 'turn on' },
    { key: 'off', label: 'turn off' },
  ],
  counter: [
    { key: 'add', label: 'add' },
    { key: 'set', label: 'set to' },
  ],
} as const;
export type EffectOp = (typeof EFFECT_OPS)[VarKind][number]['key'];

/** A thing a choice needs (or a line needs to show), or a change a choice makes. */
export interface Rule<Op extends string> {
  id: string;
  var: string;
  op: Op;
  value: number;
  order: number;
}
export type Cond = Rule<CondOp>;
export type Effect = Rule<EffectOp>;

export interface Line {
  id: string;
  text: string;
  when: Cond | null;
  order: number;
}

export type StoryState = Record<string, number>;

const asRecord = (v: unknown): Record<string, FieldValue> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, FieldValue>) : {};
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const byOrder = <T extends { order: number; id: string }>(a: T, b: T) =>
  a.order - b.order || a.id.localeCompare(b.id);

export const newRuleId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 10);

/** The adventure's story state, in order. */
export function storyVars(adventure: Pick<Entry, 'fields'>): StoryVar[] {
  return Object.entries(asRecord(adventure.fields.state))
    .map(([id, raw]) => {
      const v = asRecord(raw);
      const kind = VAR_KINDS.some((k) => k.key === v.kind) ? (v.kind as VarKind) : 'flag';
      return {
        id,
        name: typeof v.name === 'string' ? v.name : '',
        kind,
        start: kind === 'counter' ? num(v.start) : 0,
        order: num(v.order),
      };
    })
    .sort(byOrder);
}

export const varName = (v: Pick<StoryVar, 'name' | 'kind'>): string =>
  v.name.trim() || `Unnamed ${v.kind}`;

function readRules<Op extends string>(
  raw: unknown,
  ops: Record<VarKind, readonly { key: string }[]>,
): Rule<Op>[] {
  const all = new Set(Object.values(ops).flatMap((list) => list.map((o) => o.key)));
  return Object.entries(asRecord(raw))
    .map(([id, r]) => {
      const rule = asRecord(r);
      return {
        id,
        var: typeof rule.var === 'string' ? rule.var : '',
        op: rule.op as Op,
        value: num(rule.value),
        order: num(rule.order),
      };
    })
    .filter((r) => r.var && all.has(r.op))
    .sort(byOrder);
}

export const readConds = (raw: unknown): Cond[] => readRules<CondOp>(raw, COND_OPS);
export const readEffects = (raw: unknown): Effect[] => readRules<EffectOp>(raw, EFFECT_OPS);

/** A passage's lines that only show sometimes, in order. */
export function linesOf(passage: Pick<Entry, 'fields'>): Line[] {
  return Object.entries(asRecord(passage.fields.lines))
    .map(([id, raw]) => {
      const l = asRecord(raw);
      const when = l.when ? readConds({ when: l.when })[0] : undefined;
      return {
        id,
        text: typeof l.text === 'string' ? l.text : '',
        when: when ?? null,
        order: num(l.order),
      };
    })
    .sort(byOrder);
}

// ----- Playing -----

/** Where every value starts: counters at their start, items and flags without / off. */
export const startState = (vars: StoryVar[]): StoryState =>
  Object.fromEntries(vars.map((v) => [v.id, v.start]));

/** Whether the state meets a need. A need on something since deleted is always met. */
export function meets(state: StoryState, cond: Cond, vars: StoryVar[]): boolean {
  const v = vars.find((x) => x.id === cond.var);
  if (!v) return true;
  const at = state[v.id] ?? v.start;
  switch (cond.op) {
    case 'has':
    case 'on':
      return at > 0;
    case 'lacks':
    case 'off':
      return at <= 0;
    case 'atLeast':
      return at >= cond.value;
    case 'atMost':
      return at <= cond.value;
    case 'exactly':
      return at === cond.value;
  }
}

/** The needs the state doesn't meet (empty when the choice is open). */
export const unmet = (state: StoryState, conds: Cond[], vars: StoryVar[]): Cond[] =>
  conds.filter((c) => !meets(state, c, vars));

/** The state after a choice's changes. Changes to something since deleted are skipped. */
export function applyEffects(state: StoryState, effects: Effect[], vars: StoryVar[]): StoryState {
  const next = { ...state };
  for (const e of effects) {
    const v = vars.find((x) => x.id === e.var);
    if (!v) continue;
    const at = next[v.id] ?? v.start;
    next[v.id] =
      e.op === 'gain' || e.op === 'on'
        ? 1
        : e.op === 'lose' || e.op === 'off'
          ? 0
          : e.op === 'add'
            ? at + e.value
            : e.value;
  }
  return next;
}

/**
 * The state at the end of a run, worked out from the route: each step's
 * choice (`via[i]`, the choice taken in `path[i - 1]` to reach `path[i]`)
 * makes its changes in turn. Working it out, rather than saving it, means
 * going back a step (or editing a choice) never leaves the state stale.
 */
export function stateAlong(
  path: string[],
  via: string[],
  passages: Map<string, Pick<Entry, 'fields'>>,
  vars: StoryVar[],
  effectsOf: (passage: Pick<Entry, 'fields'>, choiceId: string) => Effect[],
): StoryState {
  let state = startState(vars);
  for (let i = 1; i < path.length; i++) {
    const from = passages.get(path[i - 1]!);
    const choiceId = via[i];
    if (from && choiceId) state = applyEffects(state, effectsOf(from, choiceId), vars);
  }
  return state;
}

// ----- Words -----

/** A need in words: "has the lantern", "courage is at least 2". */
export function condText(cond: Cond, vars: StoryVar[]): string {
  const v = vars.find((x) => x.id === cond.var);
  if (!v) return 'something deleted';
  const op = COND_OPS[v.kind].find((o) => o.key === cond.op)?.label ?? cond.op;
  if (v.kind === 'item') return `${op} ${varName(v)}`;
  return `${varName(v)} ${op}${v.kind === 'counter' ? ` ${cond.value}` : ''}`;
}

/** A change in words: "gain the lantern", "courage +1", "coins set to 0". */
export function effectText(effect: Effect, vars: StoryVar[]): string {
  const v = vars.find((x) => x.id === effect.var);
  if (!v) return 'something deleted';
  if (v.kind === 'counter')
    return effect.op === 'add'
      ? `${varName(v)} ${effect.value >= 0 ? '+' : '−'}${Math.abs(effect.value)}`
      : `${varName(v)} set to ${effect.value}`;
  const op = EFFECT_OPS[v.kind].find((o) => o.key === effect.op)?.label ?? effect.op;
  return `${op} ${varName(v)}`;
}

/** What the reader is carrying and what's true, for the playtest strip. */
export function stateSummary(state: StoryState, vars: StoryVar[]) {
  return {
    items: vars.filter((v) => v.kind === 'item' && (state[v.id] ?? 0) > 0).map(varName),
    flags: vars.filter((v) => v.kind === 'flag' && (state[v.id] ?? 0) > 0).map(varName),
    counters: vars
      .filter((v) => v.kind === 'counter')
      .map((v) => ({ name: varName(v), value: state[v.id] ?? v.start })),
  };
}

// ----- Saving -----

const nextOrder = (list: { order: number }[]) =>
  list.reduce((max, x) => Math.max(max, x.order + 1), 0);

export function addVar(ws: string, adventure: Pick<Entry, 'id' | 'fields'>, kind: VarKind): string {
  const id = newRuleId();
  updateEntry(
    ws,
    adventure.id,
    {},
    { [`state.${id}`]: { name: '', kind, start: 0, order: nextOrder(storyVars(adventure)) } },
  );
  return id;
}

export function updateVar(
  ws: string,
  adventureId: string,
  varId: string,
  change: { name?: string; start?: number },
) {
  const fields: Record<string, unknown> = {};
  if (change.name !== undefined) fields[`state.${varId}.name`] = change.name;
  if (change.start !== undefined) fields[`state.${varId}.start`] = change.start;
  updateEntry(ws, adventureId, {}, fields);
}

export const removeVar = (ws: string, adventureId: string, varId: string) =>
  updateEntry(ws, adventureId, {}, { [`state.${varId}`]: removedField() });

/** The first way to use something of this kind, for a new need or change. */
export const firstCondOp = (kind: VarKind): CondOp => COND_OPS[kind][0].key;
export const firstEffectOp = (kind: VarKind): EffectOp => EFFECT_OPS[kind][0].key;

/** Adds a need (`requires`) or a change (`effects`) to a choice. */
export function addRule(
  ws: string,
  passage: Pick<Entry, 'id' | 'fields'>,
  choiceId: string,
  list: 'requires' | 'effects',
  v: StoryVar,
) {
  const choices = asRecord(passage.fields.choices);
  const existing = asRecord(choices[choiceId])[list];
  const op = list === 'requires' ? firstCondOp(v.kind) : firstEffectOp(v.kind);
  const value = v.kind === 'counter' ? 1 : 0;
  updateEntry(
    ws,
    passage.id,
    {},
    {
      [`choices.${choiceId}.${list}.${newRuleId()}`]: {
        var: v.id,
        op,
        value,
        order: nextOrder(readRules(existing, list === 'requires' ? COND_OPS : EFFECT_OPS)),
      },
    },
  );
}

export function updateRule(
  ws: string,
  passageId: string,
  choiceId: string,
  list: 'requires' | 'effects',
  ruleId: string,
  change: { var?: string; op?: string; value?: number },
) {
  const base = `choices.${choiceId}.${list}.${ruleId}`;
  const fields: Record<string, unknown> = {};
  if (change.var !== undefined) fields[`${base}.var`] = change.var;
  if (change.op !== undefined) fields[`${base}.op`] = change.op;
  if (change.value !== undefined) fields[`${base}.value`] = change.value;
  updateEntry(ws, passageId, {}, fields);
}

export const removeRule = (
  ws: string,
  passageId: string,
  choiceId: string,
  list: 'requires' | 'effects',
  ruleId: string,
) => updateEntry(ws, passageId, {}, { [`choices.${choiceId}.${list}.${ruleId}`]: removedField() });

export function addLine(ws: string, passage: Pick<Entry, 'id' | 'fields'>, v: StoryVar) {
  updateEntry(
    ws,
    passage.id,
    {},
    {
      [`lines.${newRuleId()}`]: {
        text: '',
        when: { var: v.id, op: firstCondOp(v.kind), value: v.kind === 'counter' ? 1 : 0, order: 0 },
        order: nextOrder(linesOf(passage)),
      },
    },
  );
}

export function updateLine(
  ws: string,
  passageId: string,
  lineId: string,
  change: { text?: string; var?: string; op?: string; value?: number },
) {
  const base = `lines.${lineId}`;
  const fields: Record<string, unknown> = {};
  if (change.text !== undefined) fields[`${base}.text`] = change.text;
  if (change.var !== undefined) fields[`${base}.when.var`] = change.var;
  if (change.op !== undefined) fields[`${base}.when.op`] = change.op;
  if (change.value !== undefined) fields[`${base}.when.value`] = change.value;
  updateEntry(ws, passageId, {}, fields);
}

export const removeLine = (ws: string, passageId: string, lineId: string) =>
  updateEntry(ws, passageId, {}, { [`lines.${lineId}`]: removedField() });
