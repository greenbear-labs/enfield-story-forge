import type { Timestamp } from 'firebase/firestore';
import type { Section } from './section';

/** Every kind of thing a writer makes. See v1-spec-and-data-model.md, section 3. */
export const ENTRY_TYPES = [
  'page',
  'character',
  'shard',
  'shard_group',
  'concept',
  'series',
  'book',
  'part',
  'chapter',
  'scene',
  'beat',
  'plotline',
] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

/** Section colors follow the entry type, everywhere an entry is shown. */
export const ENTRY_SECTION: Record<EntryType, Section> = {
  page: 'world',
  character: 'char',
  shard: 'shard',
  shard_group: 'shard',
  concept: 'concept',
  series: 'story',
  book: 'story',
  beat: 'story',
  part: 'desk',
  chapter: 'desk',
  scene: 'desk',
  plotline: 'desk',
};

export const LINK_KINDS = [
  'mention',
  'member',
  /** Where a concept came from: a concept → a shard or shard group. */
  'source',
  'appears_in',
  'pov',
  'location',
  'plotline',
  'beat',
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export type FieldValue =
  string | number | boolean | null | string[] | { [key: string]: FieldValue };

export interface EntryModule {
  key: string;
  data: Record<string, FieldValue>;
}

/** An image stored in Firebase Storage under workspaces/{workspaceId}/... */
export interface EntryImage {
  id: string;
  storagePath: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
}

export interface Entry {
  id: string;
  /** Owner's workspace, ready for sharing later. */
  workspaceId: string;
  type: EntryType;
  /** e.g. "location", "creature". Decides the fields. */
  template?: string;
  title: string;
  icon?: string;
  /** Tree position. */
  parentId?: string | null;
  /** Fractional index string. */
  order: string;
  fields: Record<string, FieldValue>;
  modules: EntryModule[];
  tags: string[];
  /** Optional images. The first one is the cover unless coverImageId says otherwise. */
  images: EntryImage[];
  coverImageId?: string;
  /** Which story it belongs to, if any. */
  scope?: { seriesId?: string; bookId?: string };
  status?: string;
  /** Scenes only. */
  wordCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Soft delete, with a trash. */
  deletedAt?: Timestamp | null;
}

/** Rich text (TipTap JSON), stored apart from the entry so lists stay fast. */
export interface EntryBody {
  entryId: string;
  doc: Record<string, unknown>;
  updatedAt?: Timestamp;
}

export interface Link {
  id: string;
  workspaceId: string;
  fromId: string;
  toId: string;
  kind: LinkKind;
}

export interface Snapshot {
  id: string;
  entryId: string;
  doc: Record<string, unknown>;
  createdAt: Timestamp;
  note?: string;
}
