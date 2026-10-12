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
import type { Entry, LinkKind } from '../../data/types';
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
  Pick<Entry, 'title' | 'icon' | 'template' | 'parentId' | 'order' | 'tags' | 'status' | 'fields'>
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
