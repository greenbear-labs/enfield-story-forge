import type { Entry, FieldValue } from '../../data/types';
import { removedField, updateEntry } from '../../lib/entries/entries';

/**
 * Who knows what: a book's secrets (facts that matter, like "Tom is the thief"),
 * and the chapter where the reader and each character learn them. Dramatic
 * irony lives in the gap between the two. Kept on the book as
 * `fields.secrets`, keyed by secret id: { fact, order, reader, learns }.
 * A "when" is a chapter id, START (known from the beginning), or '' (never).
 */

export const START = 'start';

export interface Secret {
  id: string;
  fact: string;
  order: number;
  /** When the reader learns it. */
  reader: string;
  /** When each character learns it, by character id. */
  learns: Record<string, string>;
}

const isRecord = (v: FieldValue | undefined): v is { [key: string]: FieldValue } =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export function secretsOf(book: Entry): Secret[] {
  const raw = book.fields.secrets;
  if (!isRecord(raw)) return [];
  return Object.entries(raw)
    .flatMap(([id, v]) => {
      if (!isRecord(v)) return [];
      const learns: Record<string, string> = {};
      if (isRecord(v.learns))
        for (const [who, when] of Object.entries(v.learns))
          if (typeof when === 'string' && when) learns[who] = when;
      return [
        {
          id,
          fact: typeof v.fact === 'string' ? v.fact : '',
          order: typeof v.order === 'number' ? v.order : 0,
          reader: typeof v.reader === 'string' ? v.reader : '',
          learns,
        },
      ];
    })
    .sort((a, b) => a.order - b.order);
}

/** Where a "when" falls: 0 from the start, n for chapter n, Infinity for never (or a chapter that's gone). */
export function whenIndex(when: string, chapterIds: string[]): number {
  if (when === START) return 0;
  const i = chapterIds.indexOf(when);
  return i === -1 ? Infinity : i + 1;
}

export interface Irony {
  characterId: string;
  /** The chapter the reader learns it (0 from the start). */
  reader: number;
  /** The chapter the character learns it, or Infinity for never. */
  learns: number;
}

/** Characters the reader is ahead of: the reader knows, and the character doesn't yet. */
export function ironies(secret: Secret, characterIds: string[], chapterIds: string[]): Irony[] {
  const reader = whenIndex(secret.reader, chapterIds);
  if (reader === Infinity) return [];
  return characterIds.flatMap((id) => {
    const learns = whenIndex(secret.learns[id] ?? '', chapterIds);
    return learns > reader ? [{ characterId: id, reader, learns }] : [];
  });
}

const newSecretId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12);

export function addSecret(workspaceId: string, bookId: string, fact: string): string {
  const id = newSecretId();
  updateEntry(
    workspaceId,
    bookId,
    {},
    { [`secrets.${id}`]: { fact: fact.trim(), order: Date.now(), reader: '', learns: {} } },
  );
  return id;
}

export const setSecretFact = (workspaceId: string, bookId: string, id: string, fact: string) =>
  updateEntry(workspaceId, bookId, {}, { [`secrets.${id}.fact`]: fact });

/** Sets when the reader (who = 'reader') or a character learns a secret. */
export function setLearns(
  workspaceId: string,
  bookId: string,
  id: string,
  who: string,
  when: string,
): void {
  const path = who === 'reader' ? `secrets.${id}.reader` : `secrets.${id}.learns.${who}`;
  updateEntry(
    workspaceId,
    bookId,
    {},
    { [path]: who === 'reader' ? when : when || removedField() },
  );
}

/** Removes a secret and returns an undo that puts it back. */
export function removeSecret(workspaceId: string, bookId: string, secret: Secret): () => void {
  updateEntry(workspaceId, bookId, {}, { [`secrets.${secret.id}`]: removedField() });
  const { id, ...rest } = secret;
  return () => updateEntry(workspaceId, bookId, {}, { [`secrets.${id}`]: rest });
}
