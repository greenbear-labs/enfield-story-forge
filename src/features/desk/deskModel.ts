import type { Entry, FieldValue } from '../../data/types';
import { createEntry, updateEntry } from '../../lib/entries/entries';
import { byOrder, orderKey } from '../../lib/entries/model';
import { chapterCount, outlineFormat, outlineStructure } from '../outlines/outlineModel';
import { chapterFor } from '../outlines/structures';

const str = (v: FieldValue | undefined) => (typeof v === 'string' ? v : '');

/** A sensible chapter count for a format, when the outline doesn't set one. */
export function suggestedChapters(outline: Entry): number {
  const set = chapterCount(outline);
  if (set) return set;
  return { novel: 30, novella: 12, short: 1, tv: 5, film: 8 }[outlineFormat(outline)];
}

/** The beats (of the outline's current structure) that land in each chapter, 1-based. */
export function beatsByChapter(outline: Entry, chapters: number): string[][] {
  const out: string[][] = Array.from({ length: chapters }, () => []);
  for (const b of outlineStructure(outline).beats)
    out[chapterFor(b.position, chapters) - 1]!.push(b.key);
  return out;
}

/** True once an outline has been sent to the Writer's Desk. */
export const onDesk = (outline: Entry) => outline.fields.onDesk === true;

/**
 * Sends an outline to the Desk: it becomes a manuscript, with `chapters`
 * chapters and each beat placed in the chapter where it lands.
 */
export function sendToDesk(workspaceId: string, outline: Entry, chapters: number): void {
  const base = Date.now();
  const beats = beatsByChapter(outline, chapters);
  for (let i = 0; i < chapters; i++) {
    createEntry(workspaceId, {
      type: 'chapter',
      title: `Chapter ${i + 1}`,
      parentId: outline.id,
      order: orderKey(base + i),
      fields: { goal: '', beatKeys: beats[i]!, structure: outlineStructure(outline).key },
    });
  }
  updateEntry(workspaceId, outline.id, {}, { onDesk: true });
}

export function addChapter(workspaceId: string, bookId: string, number: number): string {
  return createEntry(workspaceId, {
    type: 'chapter',
    title: `Chapter ${number}`,
    parentId: bookId,
    fields: { goal: '', beatKeys: [] },
  });
}

export function addScene(workspaceId: string, chapter: Entry): string {
  return createEntry(workspaceId, {
    type: 'scene',
    title: 'New scene',
    parentId: chapter.id,
    fields: { bookId: chapter.parentId ?? '', summary: '', sceneType: 'scene' },
  });
}

/** Swaps an entry's place with its neighbor, `dir` -1 for up and 1 for down. */
export function move(workspaceId: string, siblings: Entry[], id: string, dir: -1 | 1): void {
  const sorted = [...siblings].sort(byOrder);
  const i = sorted.findIndex((e) => e.id === id);
  const other = sorted[i + dir];
  if (i === -1 || !other) return;
  const a = sorted[i]!;
  // Equal keys (created in the same instant) get distinct ones first.
  const [ka, kb] =
    a.order === other.order ? [`${other.order}1`, `${other.order}0`] : [other.order, a.order];
  updateEntry(workspaceId, a.id, { order: ka });
  updateEntry(workspaceId, other.id, { order: kb });
}

/** Children of `parentId`, in order. */
export const childrenOf = (entries: Entry[] | undefined, parentId: string) =>
  (entries ?? []).filter((e) => e.parentId === parentId).sort(byOrder);

export const SCENE_TYPES = [
  { key: 'scene', label: 'Scene', hint: 'Goal, conflict, then a setback or a mixed outcome.' },
  {
    key: 'sequel',
    label: 'Sequel',
    hint: 'Reaction, dilemma, then a decision that sets the next goal.',
  },
] as const;

/** The scene card's fields, in the order they're shown. POV is a character, kept separately. */
export const SCENE_FIELDS = [
  {
    key: 'summary',
    label: 'What happens',
    placeholder: 'The scene in a sentence or two.',
    long: true,
  },
  { key: 'location', label: 'Where', placeholder: 'e.g. The lighthouse, at night' },
  { key: 'goal', label: 'Goal', placeholder: 'What the POV character wants in this scene' },
  { key: 'conflict', label: 'Conflict', placeholder: 'What gets in the way' },
  { key: 'outcome', label: 'Outcome', placeholder: 'Yes, no, yes-but, or no-and' },
  { key: 'valueShift', label: 'Value shift', placeholder: 'e.g. Safe → hunted' },
] as const;

export const sceneText = (e: Entry, key: string) => str(e.fields[key]);
export const scenePov = (e: Entry) => str(e.fields.pov) || null;
export const chapterBeatKeys = (e: Entry): string[] =>
  Array.isArray(e.fields.beatKeys) ? e.fields.beatKeys : [];
export const words = (e: Entry) => e.wordCount ?? 0;

/** Every scene in a manuscript, in reading order, with its chapter and that chapter's number. */
export function manuscriptScenes(
  chapters: Entry[] | undefined,
  scenes: Entry[] | undefined,
  bookId: string,
): { scene: Entry; chapter: Entry; chapterNumber: number }[] {
  return childrenOf(chapters, bookId).flatMap((chapter, i) =>
    childrenOf(scenes, chapter.id).map((scene) => ({ scene, chapter, chapterNumber: i + 1 })),
  );
}
