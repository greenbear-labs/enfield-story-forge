import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type UpdateData,
} from 'firebase/firestore';
import type { Entry, LinkKind, Snapshot } from '../../data/types';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { trackPendingWrites } from '../firestore/sync';
import { linkId, newEntryData, newLinkData, normalizeTags, type NewEntry } from './model';

/**
 * Writes land in the local cache at once and sync later, so none of these
 * wait for the server. A rejected write (say, the rules refused it) is logged.
 */
function fireAndTrack(write: Promise<void>, what: string): void {
  write.catch((err: unknown) => console.error(`Could not ${what}`, err));
  trackPendingWrites();
}

/** Creates an entry and returns its id right away. */
export function createEntry(workspaceId: string, input: NewEntry): string {
  const { db } = getFirebase();
  const ref = doc(collection(db, paths.entries(workspaceId)));
  fireAndTrack(
    setDoc(ref, {
      ...newEntryData(workspaceId, input),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    'create the entry',
  );
  return ref.id;
}

export type EntryChanges = Partial<
  Pick<
    Entry,
    | 'title'
    | 'icon'
    | 'template'
    | 'parentId'
    | 'order'
    | 'tags'
    | 'status'
    | 'fields'
    | 'wordCount'
  >
>;

/** Pass as a value in `fieldChanges` to remove that field. */
export const removedField = () => deleteField();

/** Updates an entry. Pass `fields` as dotted keys via `fieldChanges` to change one field. */
export function updateEntry(
  workspaceId: string,
  entryId: string,
  changes: EntryChanges,
  fieldChanges: Record<string, unknown> = {},
): void {
  const { db } = getFirebase();
  const data: Record<string, unknown> = { ...changes, updatedAt: serverTimestamp() };
  if (changes.tags) data.tags = normalizeTags(changes.tags);
  for (const [key, value] of Object.entries(fieldChanges)) data[`fields.${key}`] = value;
  fireAndTrack(
    updateDoc(doc(db, paths.entry(workspaceId, entryId)), data as UpdateData<Entry>),
    'save the change',
  );
}

/** Moves an entry to the trash. Its links stay, so restoring it brings everything back. */
export function trashEntry(workspaceId: string, entryId: string): void {
  const { db } = getFirebase();
  fireAndTrack(
    updateDoc(doc(db, paths.entry(workspaceId, entryId)), { deletedAt: serverTimestamp() }),
    'move the entry to the trash',
  );
}

export function restoreEntry(workspaceId: string, entryId: string): void {
  const { db } = getFirebase();
  fireAndTrack(
    updateDoc(doc(db, paths.entry(workspaceId, entryId)), { deletedAt: null }),
    'restore the entry',
  );
}

export function addLink(workspaceId: string, fromId: string, kind: LinkKind, toId: string): void {
  const { db } = getFirebase();
  fireAndTrack(
    setDoc(
      doc(db, paths.link(workspaceId, linkId(fromId, kind, toId))),
      newLinkData(workspaceId, fromId, kind, toId),
    ),
    'link the entries',
  );
}

export function removeLink(
  workspaceId: string,
  fromId: string,
  kind: LinkKind,
  toId: string,
): void {
  const { db } = getFirebase();
  fireAndTrack(
    deleteDoc(doc(db, paths.link(workspaceId, linkId(fromId, kind, toId)))),
    'unlink the entries',
  );
}

/** Saves an entry's rich text body (TipTap JSON), which lives apart from the entry. */
export function saveBody(
  workspaceId: string,
  entryId: string,
  body: Record<string, unknown>,
): void {
  const { db } = getFirebase();
  fireAndTrack(
    setDoc(doc(db, paths.body(workspaceId, entryId)), {
      entryId,
      doc: body,
      updatedAt: serverTimestamp(),
    }),
    'save the writing',
  );
}

/** Keeps a copy of an entry's body as it is now, with an optional note. */
export function saveSnapshot(
  workspaceId: string,
  entryId: string,
  body: Record<string, unknown>,
  words: number,
  note = '',
): void {
  const { db } = getFirebase();
  fireAndTrack(
    setDoc(doc(collection(db, paths.snapshots(workspaceId, entryId))), {
      entryId,
      doc: body,
      words,
      note: note.trim(),
      createdAt: serverTimestamp(),
    }),
    'save the snapshot',
  );
}

export function deleteSnapshot(workspaceId: string, entryId: string, snapshotId: string): void {
  const { db } = getFirebase();
  fireAndTrack(
    deleteDoc(doc(db, paths.snapshot(workspaceId, entryId, snapshotId))),
    'delete the snapshot',
  );
}

/** Puts a deleted snapshot back as it was (for Undo). */
export function restoreSnapshot(workspaceId: string, snapshot: Snapshot): void {
  const { db } = getFirebase();
  const { id, ...data } = snapshot;
  fireAndTrack(
    setDoc(doc(db, paths.snapshot(workspaceId, snapshot.entryId, id)), data),
    'restore the snapshot',
  );
}
