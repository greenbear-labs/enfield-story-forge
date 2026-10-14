import type { Entry, FieldValue } from '../../data/types';
import { createEntry, saveBody, updateEntry } from '../../lib/entries/entries';
import type { MapPos } from './pathsModel';
import type { SampleRule, SampleStory } from './samples/types';

/**
 * Sample stories become ordinary adventures in the writer's workspace, so
 * they can be played, taken apart, and changed like any other.
 */

/** A doc of plain paragraphs, as the passage editor writes them. */
export const textDoc = (paragraphs: string[]) => ({
  type: 'doc',
  content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
});

/** Columns by steps from the start, so the story reads left to right on the map. */
export function sampleLayout(sample: SampleStory): Record<string, MapPos> {
  const depth = new Map<string, number>([[sample.start, 0]]);
  const queue = [sample.start];
  while (queue.length) {
    const key = queue.shift()!;
    for (const c of sample.passages[key]?.choices ?? [])
      if (!depth.has(c.to) && sample.passages[c.to]) {
        depth.set(c.to, depth.get(key)! + 1);
        queue.push(c.to);
      }
  }
  // Anything not reached goes in a column of its own at the end.
  const last = Math.max(0, ...depth.values()) + 1;
  const rows = new Map<number, number>();
  const pos: Record<string, MapPos> = {};
  for (const key of Object.keys(sample.passages)) {
    const col = depth.get(key) ?? last;
    const row = rows.get(col) ?? 0;
    rows.set(col, row + 1);
    pos[key] = { x: col * 300, y: row * 170 };
  }
  return pos;
}

const rules = (list: SampleRule<string>[] = []): Record<string, FieldValue> =>
  Object.fromEntries(
    list.map((r, i) => [`r${i + 1}`, { var: r.var, op: r.op, value: r.value ?? 0, order: i }]),
  );

export function sampleAdventureFields(sample: SampleStory): Record<string, FieldValue> {
  return {
    blurb: sample.blurb,
    categories: sample.categories,
    coverArt: sample.cover,
    sample: sample.key,
    state: Object.fromEntries(
      Object.entries(sample.vars ?? {}).map(([id, v], order) => [
        id,
        { name: v.name, kind: v.kind, start: v.start ?? 0, order },
      ]),
    ),
  };
}

/** A passage's choices and lines, with passage keys turned into entry ids. */
export function samplePassageFields(
  sample: SampleStory,
  key: string,
  idOf: (key: string) => string,
): Record<string, FieldValue> {
  const p = sample.passages[key]!;
  return {
    choices: Object.fromEntries(
      (p.choices ?? []).map((c, i) => [
        `c${i + 1}`,
        {
          label: c.label,
          to: idOf(c.to),
          order: i,
          requires: rules(c.needs),
          effects: rules(c.does),
        },
      ]),
    ),
    lines: Object.fromEntries(
      (p.lines ?? []).map((l, i) => [
        `l${i + 1}`,
        {
          text: l.text,
          when: { var: l.when.var, op: l.when.op, value: l.when.value ?? 0 },
          order: i,
        },
      ]),
    ),
  };
}

type Made = Pick<Entry, 'id' | 'title' | 'fields' | 'images' | 'coverImageId'>;

/**
 * Adds the sample to the writer's adventures. Returns what was made (with
 * each passage's prose), so it can be published straight away.
 */
export function addSample(ws: string, sample: SampleStory) {
  const adventureFields = sampleAdventureFields(sample);
  const adventureId = createEntry(ws, {
    type: 'adventure',
    title: sample.title,
    status: 'draft',
    fields: adventureFields,
  });
  const pos = sampleLayout(sample);
  const ids = new Map<string, string>();
  for (const [key, p] of Object.entries(sample.passages))
    ids.set(
      key,
      createEntry(ws, {
        type: 'passage',
        parentId: adventureId,
        title: p.title,
        fields: { pos: { ...pos[key]! }, ...(p.ending ? { ending: p.ending } : {}) },
      }),
    );
  const idOf = (key: string) => ids.get(key) ?? '';

  const passages: Made[] = [];
  const bodies = new Map<string, unknown>();
  for (const [key, p] of Object.entries(sample.passages)) {
    const id = idOf(key);
    const fields = samplePassageFields(sample, key, idOf);
    updateEntry(ws, id, {}, fields);
    const doc = textDoc(p.text);
    saveBody(ws, id, doc);
    bodies.set(id, doc);
    passages.push({
      id,
      title: p.title,
      fields: { pos: { ...pos[key]! }, ...(p.ending ? { ending: p.ending } : {}), ...fields },
      images: [],
    });
  }
  updateEntry(ws, adventureId, {}, { startId: idOf(sample.start) });
  const adventure: Made = {
    id: adventureId,
    title: sample.title,
    fields: { ...adventureFields, startId: idOf(sample.start) },
    images: [],
  };
  return { adventure, passages, bodies };
}

/** The sample an adventure was made from, if any. */
export const sampleKeyOf = (adventure: Pick<Entry, 'fields'>): string | null =>
  typeof adventure.fields.sample === 'string' ? adventure.fields.sample : null;
