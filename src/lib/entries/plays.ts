import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../../features/auth/authStore';
import { readPlay, type Play } from '../../features/paths/playModel';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { fireAndTrack } from './entries';
import { useListener, type Live } from './hooks';

/**
 * Shadow Paths playthroughs, one document per adventure in the player's own
 * workspace (`plays/{adventureId}`). Writes go to the local cache first, so
 * playing works offline.
 */

/** Saves where the reader is, and marks an ending found if they just reached a new one. */
export function savePlay(
  workspaceId: string,
  adventureId: string,
  change: { path: string[]; via: string[]; endingFound?: string },
) {
  const data: Record<string, unknown> = {
    path: change.path,
    via: change.via,
    updatedAt: serverTimestamp(),
  };
  // Merging adds the ending to the ones already found.
  if (change.endingFound) data.endings = { [change.endingFound]: Date.now() };
  fireAndTrack(
    setDoc(doc(getFirebase().db, paths.play(workspaceId, adventureId)), data, { merge: true }),
    'save your place in the story',
  );
}

/** Replaces the endings found (to forget them, or to undo that). */
export function setEndingsFound(
  workspaceId: string,
  adventureId: string,
  endings: Record<string, number>,
) {
  fireAndTrack(
    setDoc(
      doc(getFirebase().db, paths.play(workspaceId, adventureId)),
      { endings, updatedAt: serverTimestamp() },
      { mergeFields: ['endings', 'updatedAt'] },
    ),
    'save the endings found',
  );
}

/** The player's playthrough of an adventure (empty if they haven't started). */
export function usePlay(adventureId: string): Live<Play> {
  const ws = useAuthStore((s) => s.workspaceId);
  return useListener<Play>(ws ? `play:${ws}:${adventureId}` : null, (onData, onError) =>
    onSnapshot(
      doc(getFirebase().db, paths.play(ws!, adventureId)),
      (snap) => onData(readPlay(snap.data())),
      onError,
    ),
  );
}
