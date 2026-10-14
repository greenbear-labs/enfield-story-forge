import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../../features/auth/authStore';
import type { EndingType } from '../../features/paths/pathsModel';
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

/**
 * Saves where the reader is. Also marks an ending found if they just reached a
 * new one, a choice unlocked if they just spent gems on it, and (for readers)
 * the story's title and number of endings, for the profile.
 */
export function savePlay(
  workspaceId: string,
  adventureId: string,
  change: {
    path: string[];
    via: string[];
    endingFound?: { id: string; kind: EndingType };
    unlock?: { key: string; cost: number };
    story?: { title: string; total: number };
  },
) {
  const data: Record<string, unknown> = {
    path: change.path,
    via: change.via,
    updatedAt: serverTimestamp(),
  };
  // Merging adds to the endings and unlocks already there.
  if (change.endingFound) {
    data.endings = { [change.endingFound.id]: Date.now() };
    data.kinds = { [change.endingFound.id]: change.endingFound.kind };
  }
  if (change.unlock) data.unlocked = { [change.unlock.key]: change.unlock.cost };
  if (change.story) {
    data.title = change.story.title;
    data.total = change.story.total;
  }
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

/** Every playthrough the player has, by id. */
export function usePlays(): Live<Map<string, Play>> {
  const ws = useAuthStore((s) => s.workspaceId);
  return useListener<Map<string, Play>>(ws ? `plays:${ws}` : null, (onData, onError) =>
    onSnapshot(
      collection(getFirebase().db, paths.plays(ws!)),
      (snap) => onData(new Map(snap.docs.map((d) => [d.id, readPlay(d.data())]))),
      onError,
    ),
  );
}
