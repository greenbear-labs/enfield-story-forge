import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuthStore } from '../../features/auth/authStore';
import {
  chunk,
  passageData,
  readPassage,
  readStory,
  storyData,
  type PublishedPassage,
  type PublishedStory,
  type PublishStatus,
} from '../../features/paths/publishModel';
import type { Entry } from '../../data/types';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { fireAndTrack } from './entries';
import { useListener, type Live } from './hooks';
import { coverOf, imageUrl } from './images';

/**
 * Shadow Paths publishing: copies an adventure and its passages to
 * `published/`, where readers can play it. Publishing reads every passage's
 * prose, so it needs the passages' bodies (from the cache when offline).
 */

const coverUrlOf = async (entry: Entry): Promise<string | null> => {
  const cover = coverOf(entry);
  return cover ? imageUrl(cover).catch(() => null) : null;
};

/**
 * Publishes (or updates) the adventure's copy with this status. Passages that
 * were published before but are gone now are taken out.
 */
export async function publishStory(
  workspaceId: string,
  adventure: Entry,
  passages: Entry[],
  status: PublishStatus,
): Promise<void> {
  const { db } = getFirebase();
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Sign in to publish.');
  const storyRef = doc(db, paths.publishedStory(adventure.id));

  const [before, cover, pages, published] = await Promise.all([
    getDoc(storyRef).catch(() => null),
    coverUrlOf(adventure),
    Promise.all(
      passages.map(async (p) => {
        const [body, art] = await Promise.all([
          getDoc(doc(db, paths.body(workspaceId, p.id))),
          coverUrlOf(p),
        ]);
        return { id: p.id, data: passageData(p, body.data()?.doc, art) };
      }),
    ),
    getDocs(collection(db, paths.publishedPassages(adventure.id))).catch(() => null),
  ]);
  const keep = new Set(passages.map((p) => p.id));
  const gone = (published?.docs ?? []).map((d) => d.id).filter((id) => !keep.has(id));

  // The story goes first, so the rules can check who owns its passages.
  const story = {
    ...storyData(
      adventure,
      passages,
      { uid: user.uid, name: user.displayName ?? '' },
      status,
      cover,
    ),
    publishedAt: before?.data()?.publishedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const writes = [
    ...pages.map((p) => ({ id: p.id, data: p.data as Record<string, unknown> | null })),
    ...gone.map((id) => ({ id, data: null })),
  ];
  const first = writeBatch(db);
  first.set(storyRef, story);
  await first.commit();
  for (const part of chunk(writes)) {
    const batch = writeBatch(db);
    for (const w of part) {
      const ref = doc(db, paths.publishedPassages(adventure.id), w.id);
      if (w.data) batch.set(ref, w.data);
      else batch.delete(ref);
    }
    await batch.commit();
  }
}

/** Changes who can read it, without updating the copy (to stop sharing it). */
export function setStoryStatus(storyId: string, status: PublishStatus) {
  fireAndTrack(
    updateDoc(doc(getFirebase().db, paths.publishedStory(storyId)), {
      status,
      updatedAt: serverTimestamp(),
    }),
    status === 'private' ? 'stop sharing the story' : 'change who can read the story',
  );
}

/** A published story (null if it was never published, or you can't read it). */
export function usePublishedStory(storyId: string): Live<PublishedStory | null> {
  const signedIn = useAuthStore((s) => !!s.user);
  return useListener<PublishedStory | null>(
    signedIn ? `published:${storyId}` : null,
    (onData, onError) =>
      onSnapshot(
        doc(getFirebase().db, paths.publishedStory(storyId)),
        (snap) => onData(snap.exists() ? readStory(snap.id, snap.data()) : null),
        onError,
      ),
  );
}

export function usePublishedPassages(storyId: string): Live<PublishedPassage[]> {
  const signedIn = useAuthStore((s) => !!s.user);
  return useListener<PublishedPassage[]>(
    signedIn ? `publishedPassages:${storyId}` : null,
    (onData, onError) =>
      onSnapshot(
        collection(getFirebase().db, paths.publishedPassages(storyId)),
        (snap) => onData(snap.docs.map((d) => readPassage(d.id, d.data()))),
        onError,
      ),
  );
}

/** The library: every story in it. */
export function useLibrary(): Live<PublishedStory[]> {
  const signedIn = useAuthStore((s) => !!s.user);
  return useListener<PublishedStory[]>(signedIn ? 'library' : null, (onData, onError) =>
    onSnapshot(
      query(collection(getFirebase().db, paths.published()), where('status', '==', 'public')),
      (snap) => onData(snap.docs.map((d) => readStory(d.id, d.data()))),
      onError,
    ),
  );
}
