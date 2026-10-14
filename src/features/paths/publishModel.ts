import type { Entry, FieldValue } from '../../data/types';
import { adventureBlurb, adventureCategories, endingOf, startIdOf } from './pathsModel';
import type { PlayablePassage } from './Player';

/**
 * A story's published copy: what readers play. It lives outside the author's
 * workspace, at `published/{adventureId}`, with its passages below it
 * (`published/{id}/passages/{passageId}`). Only what a reader needs is copied:
 * the prose, choices, lines, endings, and pictures, never the author's notes
 * or map. The author sees changes there only when they update the copy.
 */

export const PUBLISH_STATUSES = [
  { key: 'unlisted', label: 'Shared with a link' },
  { key: 'submitted', label: 'Waiting for a review for the library' },
  { key: 'public', label: 'In the library' },
  { key: 'private', label: 'Not shared' },
] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number]['key'];

export const statusLabel = (status: PublishStatus): string =>
  PUBLISH_STATUSES.find((s) => s.key === status)!.label;

/** Whether readers other than the author can open it. */
export const isShared = (status: PublishStatus) => status !== 'private';

export interface PublishedStory {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  blurb: string;
  categories: string[];
  coverUrl: string | null;
  startId: string | null;
  /** The story's items, flags, and counters (an adventure's `fields.state`). */
  state: Record<string, FieldValue>;
  status: PublishStatus;
  passageCount: number;
  endingCount: number;
  /** Milliseconds; null until the server has written it. */
  publishedAt: number | null;
  updatedAt: number | null;
  /** The admin's note when a submission is sent back (empty otherwise). */
  reviewNote: string;
  /** Its place among the library's featured stories, or null if it isn't featured. */
  featured: number | null;
}

export interface PublishedPassage extends PlayablePassage {
  /** The prose, as TipTap JSON (null if it has none). */
  doc: unknown;
  imageUrl: string | null;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const millis = (v: unknown): number | null => {
  const t = v as { toMillis?: () => number } | null | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : null;
};

/** The story document's fields, from the adventure as it is now (timestamps aside). */
export function storyData(
  adventure: Pick<Entry, 'title' | 'fields'>,
  passages: Pick<Entry, 'fields'>[],
  owner: { uid: string; name: string },
  status: PublishStatus,
  coverUrl: string | null,
) {
  return {
    ownerId: owner.uid,
    ownerName: owner.name.trim().slice(0, 200) || 'A Shadow Paths writer',
    title: adventure.title.trim() || 'Untitled adventure',
    blurb: adventureBlurb(adventure),
    categories: adventureCategories(adventure),
    coverUrl,
    startId: startIdOf(adventure),
    state: asRecord(adventure.fields.state) as Record<string, FieldValue>,
    status,
    passageCount: passages.length,
    endingCount: passages.filter((p) => endingOf(p)).length,
  };
}

/** A passage's published fields: what a reader needs, and nothing private. */
export function passageData(
  passage: Pick<Entry, 'title' | 'fields'>,
  doc: unknown,
  imageUrl: string | null,
) {
  const fields: Record<string, FieldValue> = {};
  for (const key of ['choices', 'lines', 'ending'] as const) {
    const value = passage.fields[key];
    if (value !== undefined && value !== null) fields[key] = value;
  }
  return { title: passage.title, fields, doc: doc ?? null, imageUrl };
}

export function readStory(id: string, data: Record<string, unknown>): PublishedStory {
  const status = PUBLISH_STATUSES.some((s) => s.key === data.status)
    ? (data.status as PublishStatus)
    : 'private';
  return {
    id,
    ownerId: str(data.ownerId),
    ownerName: str(data.ownerName),
    title: str(data.title),
    blurb: str(data.blurb),
    categories: Array.isArray(data.categories)
      ? data.categories.filter((c): c is string => typeof c === 'string')
      : [],
    coverUrl: str(data.coverUrl) || null,
    startId: str(data.startId) || null,
    state: asRecord(data.state) as Record<string, FieldValue>,
    status,
    passageCount: typeof data.passageCount === 'number' ? data.passageCount : 0,
    endingCount: typeof data.endingCount === 'number' ? data.endingCount : 0,
    publishedAt: millis(data.publishedAt),
    updatedAt: millis(data.updatedAt),
    reviewNote: str(data.reviewNote),
    featured: typeof data.featured === 'number' ? data.featured : null,
  };
}

/**
 * What the admin keeps on a story that the author's update carries over:
 * where it's featured, and the review note (dropped once it's submitted again).
 */
export function keptFromReview(
  before: Record<string, unknown> | undefined,
  status: PublishStatus,
): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  if (!before) return kept;
  if (typeof before.featured === 'number') kept.featured = before.featured;
  if (before.reviewedAt) kept.reviewedAt = before.reviewedAt;
  if (typeof before.reviewNote === 'string' && before.reviewNote && status !== 'submitted')
    kept.reviewNote = before.reviewNote;
  return kept;
}

/** The library's featured stories, in the admin's order. */
export const featuredOf = (stories: PublishedStory[]) =>
  stories
    .filter((s) => s.featured !== null)
    .sort((a, b) => a.featured! - b.featured! || a.title.localeCompare(b.title));

/** The featured order with this story moved up or down one place. */
export function moveFeatured(featured: PublishedStory[], id: string, by: -1 | 1) {
  const ids = featured.map((s) => s.id);
  const at = ids.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= ids.length) return null;
  [ids[at], ids[to]] = [ids[to]!, ids[at]!];
  return ids;
}

export function readPassage(id: string, data: Record<string, unknown>): PublishedPassage {
  return {
    id,
    title: str(data.title),
    fields: asRecord(data.fields) as Entry['fields'],
    doc: data.doc ?? null,
    imageUrl: str(data.imageUrl) || null,
  };
}

/** The fields the player reads from a story: where it starts, and its state. */
export const storyFields = (story: PublishedStory): Entry['fields'] => ({
  ...(story.startId ? { startId: story.startId } : {}),
  state: story.state,
});

/** The link a reader opens to play the story. */
export const readLink = (storyId: string) => `${window.location.origin}/paths/read/${storyId}`;

/** A published story's playthrough id, kept apart from the author's playtest. */
export const readerPlayId = (storyId: string) => `pub_${storyId}`;

/** Newest first, by when it was first published. */
export const newestFirst = (a: PublishedStory, b: PublishedStory) =>
  (b.publishedAt ?? Infinity) - (a.publishedAt ?? Infinity) || a.title.localeCompare(b.title);

/** Splits writes into batches Firestore accepts (at most 500 each). */
export function chunk<T>(items: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
