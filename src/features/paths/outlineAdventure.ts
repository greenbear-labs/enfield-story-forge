import type { Entry, FieldValue } from '../../data/types';
import { addLink, createEntry, saveBody, updateEntry } from '../../lib/entries/entries';
import { byOrder } from '../../lib/entries/model';
import { beatNote, outlineStructure, spineText } from '../outlines/outlineModel';
import { createAdventure } from './pathsModel';
import { textDoc } from './sampleModel';

/**
 * Turning an outline (a `book` entry) into an adventure: each beat of its
 * structure, or each of its chapters on the Writer's Desk, becomes a passage
 * in a line, each leading to the next, the last one an ending. The writer
 * then branches it. The adventure keeps a `source` link to the outline.
 */

export type OutlineSteps = 'beats' | 'chapters';

export interface OutlineStep {
  title: string;
  /** Paragraphs of prose to start from. */
  text: string[];
  /** Private notes: what the beat asks, or the chapter's scenes. */
  notes: string;
}

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The outline's chapters on the Writer's Desk, in order. */
export const chaptersOf = (outline: Pick<Entry, 'id'>, chapters: Entry[]) =>
  chapters.filter((c) => c.parentId === outline.id).sort(byOrder);

/** What each passage starts with. */
export function outlineSteps(
  outline: Entry,
  by: OutlineSteps,
  chapters: Entry[],
  scenes: Entry[],
): OutlineStep[] {
  if (by === 'chapters')
    return chaptersOf(outline, chapters).map((c, i) => ({
      title: c.title.trim() || `Chapter ${i + 1}`,
      text: [],
      notes: scenes
        .filter((s) => s.parentId === c.id)
        .sort(byOrder)
        .map((s) => `• ${s.title.trim() || 'Untitled scene'}`)
        .join('\n'),
    }));
  const s = outlineStructure(outline);
  return s.beats.map((b) => ({
    title: b.name,
    text: paragraphs(beatNote(outline, s.key, b.key)),
    notes: b.prompt,
  }));
}

/** The outline's logline, as a blurb to start from. */
export const outlineBlurb = (outline: Entry) => spineText(outline, 'logline').trim();

/** Where each passage sits on the map: in a row, wrapping every six. */
export const linePos = (i: number) => ({ x: (i % 6) * 300, y: Math.floor(i / 6) * 220 });

/** Each passage's fields: its place, its notes, and the way on (or the ending). */
export function stepFields(
  steps: OutlineStep[],
  i: number,
  nextId: string | null,
): Record<string, FieldValue> {
  const fields: Record<string, FieldValue> = { pos: linePos(i) };
  if (steps[i]!.notes) fields.notes = steps[i]!.notes;
  if (nextId)
    fields.choices = {
      c1: { label: 'Go on', to: nextId, order: 0, requires: {}, effects: {} },
    };
  else fields.ending = 'true';
  return fields;
}

/** Makes the adventure and its passages. Returns the adventure's id. */
export function adventureFromOutline(
  ws: string,
  outline: Pick<Entry, 'id'>,
  steps: OutlineStep[],
  input: { title: string; blurb: string; categories: string[] },
): string {
  const adventureId = createAdventure(ws, input);
  const ids = steps.map((s) =>
    createEntry(ws, { type: 'passage', parentId: adventureId, title: s.title, fields: {} }),
  );
  steps.forEach((s, i) => {
    updateEntry(ws, ids[i]!, {}, stepFields(steps, i, ids[i + 1] ?? null));
    if (s.text.length) saveBody(ws, ids[i]!, textDoc(s.text));
  });
  if (ids[0]) updateEntry(ws, adventureId, {}, { startId: ids[0] });
  addLink(ws, adventureId, 'source', outline.id);
  return adventureId;
}
