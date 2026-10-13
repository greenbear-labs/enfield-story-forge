import type { Entry, Link } from '../../data/types';
import { addLink, removedField, removeLink, updateEntry } from '../../lib/entries/entries';
import { relationNotes } from './characterModel';

/**
 * The Relationship Web. A relationship is a `related` link (character → character);
 * each side keeps its own note (`fields.relations.{otherId}`) and kind
 * (`fields.relationKinds.{otherId}`). The web draws one line per pair.
 */

/** Kinds of relationship. Each has a section color, so light and dark both work. */
export const RELATION_KINDS = [
  { key: 'family', label: 'Family', sec: 'story' },
  { key: 'friend', label: 'Friends', sec: 'desk' },
  { key: 'love', label: 'Love', sec: 'char' },
  { key: 'ally', label: 'Allies', sec: 'world' },
  { key: 'rival', label: 'Rivals', sec: 'shard' },
  { key: 'enemy', label: 'Enemies', sec: 'concept' },
] as const;
export type RelationKind = (typeof RELATION_KINDS)[number]['key'];

export const kindOf = (key: string) => RELATION_KINDS.find((k) => k.key === key);

/** Relationship kinds by the other character's id. */
export function relationKinds(e: Entry): Record<string, RelationKind> {
  const raw = e.fields.relationKinds;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, RelationKind] =>
      RELATION_KINDS.some((k) => k.key === entry[1]),
    ),
  );
}

/** One line on the web: a pair of characters, with what each says about the other. */
export interface Tie {
  key: string;
  a: Entry;
  b: Entry;
  /** How a sees b, and how b sees a. Empty when that side hasn't said. */
  aOnB: string;
  bOnA: string;
  /** a → b and b → a links. A tie can be one-sided. */
  aToB: boolean;
  bToA: boolean;
  /** The kind either side gave, preferring a's. */
  kind: RelationKind | null;
}

const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

/** The ties between the given characters, one per pair, sorted by name. */
export function webTies(characters: Entry[], links: Link[]): Tie[] {
  const byId = new Map(characters.map((c) => [c.id, c]));
  const ties = new Map<string, Tie>();
  for (const l of links) {
    if (l.kind !== 'related' || l.fromId === l.toId) continue;
    const from = byId.get(l.fromId);
    const to = byId.get(l.toId);
    if (!from || !to) continue;
    const key = pairKey(from.id, to.id);
    if (!ties.has(key)) {
      const [a, b] = byName(from, to) <= 0 ? [from, to] : [to, from];
      ties.set(key, {
        key,
        a,
        b,
        aOnB: relationNotes(a)[b.id] ?? '',
        bOnA: relationNotes(b)[a.id] ?? '',
        aToB: false,
        bToA: false,
        kind: relationKinds(a)[b.id] ?? relationKinds(b)[a.id] ?? null,
      });
    }
    const tie = ties.get(key)!;
    if (from.id === tie.a.id) tie.aToB = true;
    else tie.bToA = true;
  }
  return [...ties.values()].sort((x, y) => byName(x.a, y.a) || byName(x.b, y.b));
}

const byName = (x: Entry, y: Entry) =>
  (x.title || '').localeCompare(y.title || '', undefined, { sensitivity: 'base' });

/** How many ties each character has. */
export function tieCounts(ties: Tie[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of ties) {
    counts.set(t.a.id, (counts.get(t.a.id) ?? 0) + 1);
    counts.set(t.b.id, (counts.get(t.b.id) ?? 0) + 1);
  }
  return counts;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Places characters around a circle in a `size` square, in the order given.
 * Characters with ties go on the circle; the rest wait in a row underneath, so
 * the web stays readable.
 */
export function circleLayout(ids: string[], size: number): Map<string, Point> {
  const center = size / 2;
  const radius = ids.length <= 1 ? 0 : size * 0.36;
  return new Map(
    ids.map((id, i) => {
      // Start at the top and go clockwise.
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(ids.length, 1);
      return [
        id,
        {
          x: Math.round((center + radius * Math.cos(angle)) * 10) / 10,
          y: Math.round((center + radius * Math.sin(angle)) * 10) / 10,
        },
      ];
    }),
  );
}

/**
 * Orders characters for the circle so that people who are tied tend to sit
 * near each other: start with the most connected, then keep adding whoever is
 * most tied to those already placed. Loners go last, by name.
 */
export function webOrder(characters: Entry[], ties: Tie[]): Entry[] {
  const counts = tieCounts(ties);
  const neighbours = new Map<string, Set<string>>();
  for (const t of ties) {
    if (!neighbours.has(t.a.id)) neighbours.set(t.a.id, new Set());
    if (!neighbours.has(t.b.id)) neighbours.set(t.b.id, new Set());
    neighbours.get(t.a.id)!.add(t.b.id);
    neighbours.get(t.b.id)!.add(t.a.id);
  }
  const left = [...characters].sort(
    (x, y) => (counts.get(y.id) ?? 0) - (counts.get(x.id) ?? 0) || byName(x, y),
  );
  const order: Entry[] = [];
  while (left.length) {
    const last = order[order.length - 1];
    const next = last ? left.findIndex((c) => neighbours.get(last.id)?.has(c.id)) : -1;
    order.push(...left.splice(next === -1 ? 0 : next, 1));
  }
  return order;
}

/** Ties a and b (a → b), with an optional kind and how a sees b. */
export function addTie(
  workspaceId: string,
  a: string,
  b: string,
  kind: RelationKind | '',
  note: string,
): void {
  addLink(workspaceId, a, 'related', b);
  const fields: Record<string, string> = {};
  if (kind) fields[`relationKinds.${b}`] = kind;
  if (note.trim()) fields[`relations.${b}`] = note.trim();
  if (Object.keys(fields).length) updateEntry(workspaceId, a, {}, fields);
}

/** Sets the kind on each side of a tie that has a link, or clears it. */
export function setTieKind(workspaceId: string, tie: Tie, kind: RelationKind | ''): void {
  const value = kind || removedField();
  if (tie.aToB) updateEntry(workspaceId, tie.a.id, {}, { [`relationKinds.${tie.b.id}`]: value });
  if (tie.bToA) updateEntry(workspaceId, tie.b.id, {}, { [`relationKinds.${tie.a.id}`]: value });
}

/** Removes both sides of a tie, notes and kinds included. Returns an undo. */
export function removeTie(workspaceId: string, tie: Tie): () => void {
  const sides = [
    { from: tie.a, to: tie.b, linked: tie.aToB },
    { from: tie.b, to: tie.a, linked: tie.bToA },
  ];
  const saved = sides.map((s) => ({
    ...s,
    note: relationNotes(s.from)[s.to.id] ?? '',
    kind: (relationKinds(s.from)[s.to.id] ?? '') as RelationKind | '',
  }));
  for (const s of sides) {
    if (s.linked) removeLink(workspaceId, s.from.id, 'related', s.to.id);
    updateEntry(
      workspaceId,
      s.from.id,
      {},
      { [`relations.${s.to.id}`]: removedField(), [`relationKinds.${s.to.id}`]: removedField() },
    );
  }
  return () => {
    for (const s of saved) if (s.linked) addTie(workspaceId, s.from.id, s.to.id, s.kind, s.note);
  };
}
