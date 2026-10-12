import type { Entry, EntryType, FieldValue, Link, LinkKind } from '../../data/types';

/** What a caller supplies to create an entry. Everything else gets a default. */
export interface NewEntry {
  type: EntryType;
  title?: string;
  template?: string;
  icon?: string;
  parentId?: string | null;
  fields?: Record<string, FieldValue>;
  tags?: string[];
  status?: string;
  /** Position among siblings. Defaults to creation time, so new entries go last. */
  order?: string;
}

/** The stored fields of a new entry, minus timestamps (the data layer adds those). */
export function newEntryData(workspaceId: string, input: NewEntry, now = Date.now()) {
  return {
    workspaceId,
    type: input.type,
    template: input.template,
    title: input.title?.trim() ?? '',
    icon: input.icon,
    parentId: input.parentId ?? null,
    order: input.order ?? orderKey(now),
    fields: input.fields ?? {},
    modules: [],
    tags: normalizeTags(input.tags ?? []),
    images: [],
    status: input.status,
    // Stored as null (not left out) so "not in the trash" is an equality query.
    deletedAt: null,
  };
}

/**
 * A sortable order key. Newer entries sort after older ones. Drag-and-drop
 * reordering will insert keys between these later.
 */
export function orderKey(now = Date.now()): string {
  return now.toString(36).padStart(10, '0');
}

/** Tags are trimmed, lowercased, de-duplicated, and kept in the order given. */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#/, '').replace(/\s+/g, ' ').toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/**
 * Links get a deterministic id, so linking the same two entries twice is a
 * no-op instead of a duplicate.
 */
export function linkId(fromId: string, kind: LinkKind, toId: string): string {
  return `${fromId}__${kind}__${toId}`;
}

export function newLinkData(
  workspaceId: string,
  fromId: string,
  kind: LinkKind,
  toId: string,
): Omit<Link, 'id'> {
  return { workspaceId, fromId, toId, kind };
}

/** All the text in an entry that search should look at. */
export function searchableText(entry: Pick<Entry, 'title' | 'fields' | 'tags'>): string {
  const parts: string[] = [entry.title, ...entry.tags];
  const walk = (v: FieldValue) => {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  Object.values(entry.fields).forEach(walk);
  return parts.join('\n').toLowerCase();
}

/** True when every word of the query appears somewhere in the entry. */
export function matchesQuery(entry: Pick<Entry, 'title' | 'fields' | 'tags'>, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = searchableText(entry);
  return words.every((w) => text.includes(w.replace(/^#/, '')));
}

const millis = (t: Entry['updatedAt'] | undefined) => (t ? t.toMillis() : Date.now());

/** Sibling order: chapters in a book, scenes in a chapter. */
export const byOrder = (a: Pick<Entry, 'order'>, b: Pick<Entry, 'order'>) =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : 0;

export const newestFirst = (a: Entry, b: Entry) => millis(b.createdAt) - millis(a.createdAt);
export const recentlyUpdatedFirst = (a: Entry, b: Entry) =>
  millis(b.updatedAt) - millis(a.updatedAt);
