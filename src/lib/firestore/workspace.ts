import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebase } from '../firebase/client';
import { paths } from './paths';
import { trackPendingWrites } from './sync';

/**
 * Makes sure the user's personal workspace (workspaces/{uid}) exists.
 * Returns the workspace id. Safe to call on every sign-in.
 */
export async function ensurePersonalWorkspace(uid: string): Promise<string> {
  const { db } = getFirebase();
  const ref = doc(db, paths.workspace(uid));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Not awaited: with the offline cache the write lands locally at once and syncs later.
    setDoc(ref, {
      ownerId: uid,
      memberIds: [uid],
      name: 'My workspace',
      createdAt: serverTimestamp(),
    }).catch((err: unknown) => console.error('Could not create the workspace', err));
    trackPendingWrites();
  }
  return uid;
}
