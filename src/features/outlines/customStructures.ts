import type { Entry, FieldValue } from '../../data/types';
import { createEntry, updateEntry } from '../../lib/entries/entries';
import type { Beat, Structure } from './structures';

/*
 * Structures the writer makes. Each is a `structure` entry: the title is its
 * name, `fields.bestFor` says what it suits, and `fields.beats` holds the
 * beats keyed by id ({name, part, position, prompt}). In an outline it's
 * chosen by the key `custom-{entryId}`.
 */

export const CUSTOM_PREFIX = 'custom-';
export const customKey = (entryId: string) => `${CUSTOM_PREFIX}${entryId}`;
export const customEntryId = (key: string) =>
  key.startsWith(CUSTOM_PREFIX) ? key.slice(CUSTOM_PREFIX.length) : null;

const text = (v: FieldValue | undefined) => (typeof v === 'string' ? v : '');
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** A structure entry's beats, from start to end. */
export function beatsOf(e: Pick<Entry, 'fields'>): Beat[] {
  const raw = e.fields.beats;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw)
    .flatMap(([key, v]): Beat[] => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return [];
      return [
        {
          key,
          name: text(v.name),
          part: text(v.part),
          prompt: text(v.prompt),
          position: typeof v.position === 'number' ? clamp(v.position) : 0,
        },
      ];
    })
    .sort((a, b) => a.position - b.position || a.key.localeCompare(b.key));
}

/** The entry as a structure the Outline Builder can use. */
export function structureFromEntry(e: Entry): Structure {
  return {
    key: customKey(e.id),
    name: e.title.trim() || 'Untitled structure',
    origin: 'you',
    bestFor: text(e.fields.bestFor).trim() || 'Your own stories',
    beats: beatsOf(e).map((b) => ({ ...b, name: b.name.trim() || 'Untitled beat' })),
    custom: true,
  };
}

export const newBeatId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12);

const beatData = (b: Omit<Beat, 'key'>) => ({
  name: b.name,
  part: b.part,
  position: clamp(b.position),
  prompt: b.prompt,
});

/**
 * Makes a new structure and returns its id. Starting from a library structure
 * copies its beats (with their keys, so notes line up), to change as you like.
 */
export function createStructure(workspaceId: string, from?: Structure): string {
  const beats: Record<string, FieldValue> = {};
  if (from) for (const b of from.beats) beats[b.key] = beatData(b);
  else {
    const starter: [string, number, string][] = [
      ['Beginning', 0.1, 'Act 1'],
      ['Middle', 0.5, 'Act 2'],
      ['End', 0.9, 'Act 3'],
    ];
    for (const [name, position, part] of starter)
      beats[newBeatId()] = beatData({ name, position, part, prompt: '' });
  }
  return createEntry(workspaceId, {
    type: 'structure',
    title: from ? `${from.name} (my version)` : 'My structure',
    fields: { bestFor: from?.bestFor ?? '', beats },
  });
}

/** Adds a beat after `after` (halfway to the next one), or at the end. Returns its id. */
export function addBeat(workspaceId: string, structure: Entry, after?: Beat): string {
  const beats = beatsOf(structure);
  const at = after ? beats.findIndex((b) => b.key === after.key) : beats.length - 1;
  const prev = beats[at];
  const next = beats[at + 1];
  const position = prev
    ? next
      ? (prev.position + next.position) / 2
      : (prev.position + 1) / 2
    : 0.5;
  const id = newBeatId();
  updateEntry(
    workspaceId,
    structure.id,
    {},
    {
      [`beats.${id}`]: beatData({ name: '', part: prev?.part ?? '', position, prompt: '' }),
    },
  );
  return id;
}

export const beatFieldsData = beatData;

/** Outlines whose structure, or compared structure, is this one. */
export function outlinesUsing(books: Entry[], key: string): Entry[] {
  return books.filter((b) => b.fields.structure === key || b.fields.overlay === key);
}
