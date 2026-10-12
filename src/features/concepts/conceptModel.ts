import type { Entry, FieldValue } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { matchesQuery, newestFirst } from '../../lib/entries/model';

export const CONCEPT_STATUSES = [
  { key: 'spark', label: 'Spark' },
  { key: 'shaping', label: 'Shaping' },
  { key: 'ready', label: 'Ready to outline' },
] as const;
export type ConceptStatus = (typeof CONCEPT_STATUSES)[number]['key'];

const STATUS_LABELS = new Map<string, string>(CONCEPT_STATUSES.map((s) => [s.key, s.label]));

export const conceptStatus = (e: Entry): ConceptStatus =>
  e.status && STATUS_LABELS.has(e.status) ? (e.status as ConceptStatus) : 'spark';
export const conceptStatusLabel = (s: string) => STATUS_LABELS.get(s) ?? 'Spark';

const str = (v: FieldValue | undefined) => (typeof v === 'string' ? v : '');

/** The one-sentence pitch. */
export const conceptLogline = (e: Entry) => str(e.fields.logline);
/** Longer notes: what it's about, what excites you, open questions. */
export const conceptNotes = (e: Entry) => str(e.fields.notes);
export const conceptGenre = (e: Entry) => str(e.fields.genre);

export interface ConceptInput {
  title?: string;
  logline?: string;
  notes?: string;
  /** The Generator's picks, kept so the concept can be re-rolled or mashed up later. */
  parts?: Record<string, string>;
  /** Shards and shard groups it came from. */
  sourceIds?: string[];
}

export function createConcept(workspaceId: string, input: ConceptInput): string {
  const fields: Record<string, FieldValue> = {
    logline: input.logline?.trim() ?? '',
    notes: input.notes ?? '',
    genre: '',
  };
  if (input.parts) fields.parts = input.parts;
  const id = createEntry(workspaceId, {
    type: 'concept',
    title: input.title?.trim() || 'Untitled concept',
    fields,
    status: 'spark',
  });
  for (const sourceId of input.sourceIds ?? []) addLink(workspaceId, id, 'source', sourceId);
  return id;
}

/** Concepts matching a search and an optional status, newest first. */
export function filterConcepts(
  concepts: Entry[],
  { query, status }: { query: string; status: ConceptStatus | null },
): Entry[] {
  return concepts
    .filter((c) => (status ? conceptStatus(c) === status : true) && matchesQuery(c, query))
    .sort(newestFirst);
}
