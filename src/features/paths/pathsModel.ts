import type { Entry, FieldValue } from '../../data/types';
import { createEntry, removedField, updateEntry } from '../../lib/entries/entries';
import { readConds, readEffects, type Cond, type Effect } from './stateModel';

/**
 * Shadow Paths data. An adventure (`adventure` entry) is one
 * choose-your-own-adventure story: `fields.blurb` is its back-cover line,
 * `fields.categories` its library shelves. Its passages are below.
 */

/** The library's shelves, from the old Shadow Paths. */
export const CATEGORIES = [
  'Adventure',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Horror',
  'Romance',
  'Comedy',
  'Drama',
  'Historical',
  'Mythic',
  'Steampunk',
  'Post-Apocalyptic',
] as const;

/** Built-in art used as a cover (sample stories), from public/paths-art/. */
export function coverArtOf(entry: Pick<Entry, 'fields'>): string | null {
  const art = entry.fields.coverArt;
  return typeof art === 'string' && /^\/paths-art\/[\w-]+\.webp$/.test(art) ? art : null;
}

export const adventureBlurb = (adventure: Pick<Entry, 'fields'>): string =>
  typeof adventure.fields.blurb === 'string' ? adventure.fields.blurb : '';

/** The adventure's categories, in library order, ignoring any the app doesn't know. */
export function adventureCategories(adventure: Pick<Entry, 'fields'>): string[] {
  const raw = adventure.fields.categories;
  const picked = new Set(Array.isArray(raw) ? raw : []);
  return CATEGORIES.filter((c) => picked.has(c));
}

/** Adds the category, or takes it away if it's already there. */
export function toggleCategory(categories: string[], category: string): string[] {
  const next = categories.includes(category)
    ? categories.filter((c) => c !== category)
    : [...categories, category];
  return CATEGORIES.filter((c) => next.includes(c));
}

export function createAdventure(
  ws: string,
  input: { title: string; blurb: string; categories: string[] },
): string {
  return createEntry(ws, {
    type: 'adventure',
    title: input.title.trim() || 'Untitled adventure',
    status: 'draft',
    fields: {
      blurb: input.blurb.trim(),
      categories: CATEGORIES.filter((c) => input.categories.includes(c)),
    },
  });
}

// ----- Passages, choices, and endings -----
// A passage is a `passage` entry (parent: the adventure). Its prose is its body,
// its place on the map `fields.pos`, its private notes `fields.notes`. Its
// choices are `fields.choices`, keyed by id: `{label, to, order}`, where `to`
// is another passage's id (or empty, not decided yet). An ending is a passage
// with `fields.ending` set to its type. The adventure's first passage is its
// `fields.startId`.

export const ENDING_TYPES = [
  { key: 'true', label: 'True ending', blurb: 'The way it was meant to end' },
  { key: 'secret', label: 'Secret ending', blurb: 'Only the curious find it' },
  { key: 'death', label: 'Death', blurb: 'The path ends here, badly' },
  { key: 'other', label: 'Other ending', blurb: 'An ending, of a kind' },
] as const;
export type EndingType = (typeof ENDING_TYPES)[number]['key'];

export interface Choice {
  id: string;
  label: string;
  /** The passage it leads to, or null if that isn't decided yet. */
  to: string | null;
  order: number;
  /** What the reader needs to take it (all of them). */
  requires: Cond[];
  /** What taking it changes. */
  effects: Effect[];
  /** Gems a reader spends to unlock it, once (0: free). */
  cost: number;
}

export interface MapPos {
  x: number;
  y: number;
}

const asRecord = (v: unknown): Record<string, FieldValue> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, FieldValue>) : {};

export const newChoiceId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12);

export const passageName = (passage: Pick<Entry, 'title'>): string =>
  passage.title.trim() || 'Untitled passage';

export const passageNotes = (passage: Pick<Entry, 'fields'>): string =>
  typeof passage.fields.notes === 'string' ? passage.fields.notes : '';

export const startIdOf = (adventure: Pick<Entry, 'fields'>): string | null =>
  typeof adventure.fields.startId === 'string' && adventure.fields.startId
    ? adventure.fields.startId
    : null;

export function endingOf(passage: Pick<Entry, 'fields'>): EndingType | null {
  const e = passage.fields.ending;
  return ENDING_TYPES.some((t) => t.key === e) ? (e as EndingType) : null;
}

export const endingLabel = (type: EndingType): string =>
  ENDING_TYPES.find((t) => t.key === type)!.label;

export function posOf(passage: Pick<Entry, 'fields'>): MapPos {
  const p = asRecord(passage.fields.pos);
  return {
    x: typeof p.x === 'number' ? p.x : 0,
    y: typeof p.y === 'number' ? p.y : 0,
  };
}

/** A passage's choices, in order. */
export function choicesOf(passage: Pick<Entry, 'fields'>): Choice[] {
  return Object.entries(asRecord(passage.fields.choices))
    .map(([id, raw]) => {
      const c = asRecord(raw);
      return {
        id,
        label: typeof c.label === 'string' ? c.label : '',
        to: typeof c.to === 'string' && c.to ? c.to : null,
        order: typeof c.order === 'number' ? c.order : 0,
        requires: readConds(c.requires),
        effects: readEffects(c.effects),
        cost: typeof c.cost === 'number' && c.cost > 0 ? Math.round(c.cost) : 0,
      };
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** The most gems a choice can cost. */
export const MAX_COST = 99;

/** The order after the last choice, for a new one. */
export const nextChoiceOrder = (choices: Choice[]): number =>
  choices.reduce((max, c) => Math.max(max, c.order + 1), 0);

/**
 * Passages in reading order: from the start, following choices breadth-first,
 * then any the start can't reach, oldest first. For the list view.
 */
export function storyOrder<P extends Pick<Entry, 'id' | 'fields' | 'order'>>(
  passages: P[],
  startId: string | null,
): { passage: P; reachable: boolean }[] {
  const byId = new Map(passages.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: { passage: P; reachable: boolean }[] = [];
  const queue = startId && byId.has(startId) ? [startId] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const passage = byId.get(id)!;
    out.push({ passage, reachable: true });
    for (const c of choicesOf(passage))
      if (c.to && byId.has(c.to) && !seen.has(c.to)) queue.push(c.to);
  }
  const rest = passages
    .filter((p) => !seen.has(p.id))
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
  for (const passage of rest) out.push({ passage, reachable: false });
  return out;
}

/** Choices across the adventure that lead to `passageId`. */
export function choicesInto<P extends Pick<Entry, 'id' | 'fields'>>(
  passages: P[],
  passageId: string,
): { from: P; choice: Choice }[] {
  return passages.flatMap((from) =>
    choicesOf(from)
      .filter((c) => c.to === passageId)
      .map((choice) => ({ from, choice })),
  );
}

/** About how much room a passage card takes on the map. */
export const CARD = { width: 220, height: 120 };

/**
 * The nearest spot at or below `want` where a new card won't sit on top of
 * another passage's card. Steps down a card's height at a time.
 */
export function freeSpot(passages: Pick<Entry, 'fields'>[], want: MapPos): MapPos {
  const taken = passages.map(posOf);
  const at = { x: Math.round(want.x), y: Math.round(want.y) };
  for (let tries = 0; tries < 50; tries++) {
    const hit = taken.find(
      (p) => Math.abs(p.x - at.x) < CARD.width && Math.abs(p.y - at.y) < CARD.height,
    );
    if (!hit) return at;
    at.y = hit.y + CARD.height;
  }
  return at;
}

export function createPassage(
  ws: string,
  adventure: Pick<Entry, 'id' | 'fields'>,
  pos: MapPos,
  input: { title?: string; ending?: EndingType } = {},
): string {
  const id = createEntry(ws, {
    type: 'passage',
    parentId: adventure.id,
    title: input.title ?? '',
    fields: {
      pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
      ...(input.ending ? { ending: input.ending } : {}),
    },
  });
  // The first passage of a story is where it starts.
  if (!startIdOf(adventure)) setStart(ws, adventure.id, id);
  return id;
}

export const setStart = (ws: string, adventureId: string, passageId: string) =>
  updateEntry(ws, adventureId, {}, { startId: passageId });

export const movePassage = (ws: string, passageId: string, pos: MapPos) =>
  updateEntry(ws, passageId, {}, { pos: { x: Math.round(pos.x), y: Math.round(pos.y) } });

export const setEnding = (ws: string, passageId: string, ending: EndingType | null) =>
  updateEntry(ws, passageId, {}, { ending: ending ?? removedField() });

export function addChoice(
  ws: string,
  passage: Pick<Entry, 'id' | 'fields'>,
  to: string | null,
  label = '',
): string {
  const id = newChoiceId();
  updateEntry(
    ws,
    passage.id,
    {},
    {
      [`choices.${id}`]: { label, to: to ?? '', order: nextChoiceOrder(choicesOf(passage)) },
    },
  );
  return id;
}

export function updateChoice(
  ws: string,
  passageId: string,
  choiceId: string,
  change: { label?: string; to?: string | null; order?: number; cost?: number },
): void {
  const fields: Record<string, unknown> = {};
  if (change.label !== undefined) fields[`choices.${choiceId}.label`] = change.label;
  if (change.to !== undefined) fields[`choices.${choiceId}.to`] = change.to ?? '';
  if (change.order !== undefined) fields[`choices.${choiceId}.order`] = change.order;
  if (change.cost !== undefined)
    fields[`choices.${choiceId}.cost`] =
      change.cost > 0 ? Math.min(MAX_COST, Math.round(change.cost)) : removedField();
  updateEntry(ws, passageId, {}, fields);
}

export const removeChoice = (ws: string, passageId: string, choiceId: string) =>
  updateEntry(ws, passageId, {}, { [`choices.${choiceId}`]: removedField() });

/** Swaps a choice with its neighbour, so it moves one place up (-1) or down (+1). */
export function moveChoice(
  ws: string,
  passage: Pick<Entry, 'id' | 'fields'>,
  choiceId: string,
  by: -1 | 1,
) {
  const list = choicesOf(passage);
  const i = list.findIndex((c) => c.id === choiceId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return;
  // Renumber so equal orders can't get stuck.
  const next = list.map((c) => c.id);
  [next[i], next[j]] = [next[j]!, next[i]!];
  updateEntry(
    ws,
    passage.id,
    {},
    Object.fromEntries(next.map((id, order) => [`choices.${id}.order`, order])),
  );
}
