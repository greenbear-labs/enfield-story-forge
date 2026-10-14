import type { Entry, FieldValue } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { DEFAULT_STRUCTURE, structureByKey } from './structures';

export const FORMATS = [
  { key: 'novel', label: 'Novel' },
  { key: 'novella', label: 'Novella' },
  { key: 'short', label: 'Short story' },
  { key: 'tv', label: 'TV episode' },
  { key: 'film', label: 'Film' },
] as const;
export type Format = (typeof FORMATS)[number]['key'];

/** "How do you want to start?" Each way in is a different order through the same spine. */
export const START_METHODS = [
  { key: 'concept', label: 'An idea', hint: 'Start from a concept in your Concept Bank.' },
  {
    key: 'theme',
    label: 'Theme and ending',
    hint: 'Decide what it argues and how it ends, then work back.',
  },
  {
    key: 'character',
    label: 'A character',
    hint: 'Start from someone in your cast and what they need.',
  },
  { key: 'premise', label: 'A premise', hint: 'Start from a one-sentence what-if.' },
] as const;
export type StartMethod = (typeof START_METHODS)[number]['key'];

export interface SpineSlot {
  key: string;
  label: string;
  prompt: string;
}

/** The Story Spine: the same slots for every story, filled in any order. */
export const SPINE_SLOTS: SpineSlot[] = [
  { key: 'logline', label: 'Logline', prompt: 'The whole story in one sentence.' },
  {
    key: 'themeQuestion',
    label: 'Theme question',
    prompt: 'What question does the story argue? e.g. Is safety worth giving up freedom?',
  },
  {
    key: 'controllingIdea',
    label: 'Controlling idea',
    prompt: 'Your answer to the theme question. The climax proves it.',
  },
  {
    key: 'conflict',
    label: 'Central conflict',
    prompt: 'Who or what stands in the way, and why can’t both sides win?',
  },
  { key: 'ending', label: 'The climax', prompt: 'The moment the hero’s choice shows the answer.' },
  {
    key: 'resolution',
    label: 'The resolution',
    prompt: 'What the world and the hero look like after that choice.',
  },
  {
    key: 'opening',
    label: 'The opening state',
    prompt: 'Where the hero starts: believing the wrong answer.',
  },
  { key: 'want', label: 'Want', prompt: 'What the hero is chasing.' },
  { key: 'need', label: 'Need', prompt: 'What the hero actually needs.' },
  { key: 'lie', label: 'The lie', prompt: 'What the hero believes that isn’t true.' },
  { key: 'truth', label: 'The truth', prompt: 'What the hero has to learn.' },
];

/** The order each way in walks through the spine. Theme-first follows the ending-first guide. */
const SPINE_ORDER: Record<StartMethod, string[]> = {
  theme: [
    'themeQuestion',
    'controllingIdea',
    'ending',
    'resolution',
    'opening',
    'lie',
    'truth',
    'want',
    'need',
    'conflict',
    'logline',
  ],
  character: [
    'want',
    'need',
    'lie',
    'truth',
    'conflict',
    'ending',
    'themeQuestion',
    'controllingIdea',
    'opening',
    'resolution',
    'logline',
  ],
  concept: [
    'logline',
    'conflict',
    'want',
    'need',
    'ending',
    'themeQuestion',
    'controllingIdea',
    'lie',
    'truth',
    'opening',
    'resolution',
  ],
  premise: [
    'logline',
    'conflict',
    'want',
    'need',
    'ending',
    'themeQuestion',
    'controllingIdea',
    'lie',
    'truth',
    'opening',
    'resolution',
  ],
};

const SLOTS_BY_KEY = new Map(SPINE_SLOTS.map((s) => [s.key, s]));

export const spineFor = (method: StartMethod): SpineSlot[] =>
  SPINE_ORDER[method].map((k) => SLOTS_BY_KEY.get(k)!);

const str = (v: FieldValue | undefined) => (typeof v === 'string' ? v : '');
const map = (v: FieldValue | undefined): Record<string, FieldValue> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

const METHOD_KEYS = new Set<string>(START_METHODS.map((m) => m.key));
const FORMAT_LABELS = new Map<string, string>(FORMATS.map((f) => [f.key, f.label]));

export const outlineMethod = (e: Entry): StartMethod =>
  METHOD_KEYS.has(str(e.fields.start)) ? (str(e.fields.start) as StartMethod) : 'premise';
export const outlineFormat = (e: Entry): Format =>
  FORMAT_LABELS.has(str(e.fields.format)) ? (str(e.fields.format) as Format) : 'novel';
export const formatLabel = (f: string) => FORMAT_LABELS.get(f) ?? 'Novel';
export const outlineStructure = (e: Entry) => structureByKey(str(e.fields.structure));
export const spineText = (e: Entry, slot: string) => str(map(e.fields.spine)[slot]);
export const protagonistId = (e: Entry) => str(e.fields.protagonistId) || null;

/** The structure shown alongside, or null. */
export const outlineOverlay = (e: Entry) => {
  const key = str(e.fields.overlay);
  return key && key !== str(e.fields.structure) ? structureByKey(key) : null;
};

/** How many chapters to spread the beats across, or null when not set. */
export function chapterCount(e: Entry): number | null {
  const n = e.fields.chapters;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

/** Other structures this outline has notes in. */
export function structuresWithNotes(e: Entry): string[] {
  return Object.entries(map(e.fields.beatNotes))
    .filter(([, notes]) => Object.values(map(notes)).some((v) => str(v).trim()))
    .map(([key]) => key);
}

/** A beat's note, for a given structure (notes for every structure are kept). */
export const beatNote = (e: Entry, structure: string, beat: string) =>
  str(map(map(e.fields.beatNotes)[structure])[beat]);

/** The dotted keys `updateEntry` takes for spine slots and beat notes. */
export const spinePath = (slot: string) => `spine.${slot}`;
export const beatPath = (structure: string, beat: string) => `beatNotes.${structure}.${beat}`;

/** How many beats of the outline's current structure have a note. */
export function beatsFilled(e: Entry): { filled: number; total: number } {
  const s = outlineStructure(e);
  return {
    filled: s.beats.filter((b) => beatNote(e, s.key, b.key).trim()).length,
    total: s.beats.length,
  };
}

export interface OutlineInput {
  title: string;
  format: Format;
  structure?: string;
  start: StartMethod;
  seriesId?: string | null;
  spine?: Record<string, string>;
  protagonistId?: string | null;
  conceptId?: string | null;
  /** A character group the story grows from: it becomes the story's cast. */
  groupId?: string | null;
  castIds?: string[];
}

/** An outline is a `book` entry. Its series, if any, is its parent. */
export function createOutline(workspaceId: string, input: OutlineInput): string {
  const spine = Object.fromEntries(
    Object.entries(input.spine ?? {})
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v),
  );
  const fields: Record<string, FieldValue> = {
    format: input.format,
    structure: input.structure ?? DEFAULT_STRUCTURE,
    start: input.start,
    spine,
    beatNotes: {},
  };
  if (input.protagonistId) fields.protagonistId = input.protagonistId;
  const id = createEntry(workspaceId, {
    type: 'book',
    title: input.title.trim() || 'Untitled story',
    parentId: input.seriesId ?? null,
    fields,
  });
  if (input.conceptId) addLink(workspaceId, id, 'source', input.conceptId);
  if (input.groupId) addLink(workspaceId, id, 'source', input.groupId);
  for (const characterId of input.castIds ?? []) addLink(workspaceId, characterId, 'cast', id);
  return id;
}

export function createSeries(workspaceId: string, title: string): string {
  return createEntry(workspaceId, { type: 'series', title: title.trim() || 'Untitled series' });
}

/** Outlines grouped by series (in name order), then the standalone ones. Newest first inside. */
export function groupBySeries(
  books: Entry[],
  series: Entry[],
): { series: Entry | null; books: Entry[] }[] {
  const byNewest = (a: Entry, b: Entry) =>
    (b.updatedAt?.toMillis() ?? Date.now()) - (a.updatedAt?.toMillis() ?? Date.now());
  const seriesIds = new Set(series.map((s) => s.id));
  const groups = [...series]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((s) => ({
      series: s as Entry | null,
      books: books.filter((b) => b.parentId === s.id).sort(byNewest),
    }));
  const loose = books.filter((b) => !b.parentId || !seriesIds.has(b.parentId)).sort(byNewest);
  return [...groups, ...(loose.length ? [{ series: null, books: loose }] : [])];
}

/** Every filled spine slot and beat note, labeled, for export. */
export function outlineSummary(e: Entry): { spine: [string, string][]; beats: [string, string][] } {
  const s = outlineStructure(e);
  return {
    spine: spineFor(outlineMethod(e)).flatMap((slot): [string, string][] => {
      const v = spineText(e, slot.key).trim();
      return v ? [[slot.label, v]] : [];
    }),
    beats: s.beats.flatMap((b): [string, string][] => {
      const v = beatNote(e, s.key, b.key).trim();
      return v ? [[b.name, v]] : [];
    }),
  };
}
