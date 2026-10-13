import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getFirebase } from '../../lib/firebase/client';
import { paths } from '../../lib/firestore/paths';
import { trackPendingWrites } from '../../lib/firestore/sync';
import { useListener, type Live } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';

/*
 * Notes from the "Send feedback" button. They live in a top-level `feedback`
 * collection: anyone signed in can add one, and only the admin (see
 * firestore.rules) can read them, on the Feedback inbox page.
 */

export const FEEDBACK_KINDS = [
  { key: 'problem', label: 'Something’s wrong' },
  { key: 'idea', label: 'An idea' },
  { key: 'other', label: 'Something else' },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]['key'];

export const MAX_FEEDBACK = 5000;

export interface FeedbackNote {
  id: string;
  uid: string;
  name: string;
  email: string;
  kind: FeedbackKind;
  message: string;
  /** The page they were on and their browser, if they agreed to send them. */
  page: string;
  device: string;
  status: 'new' | 'done';
  createdAt?: Timestamp;
}

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  page?: string;
  device?: string;
}

/** What gets stored for a note. Exported for tests. */
export function feedbackData(
  user: { uid: string; displayName?: string | null; email?: string | null },
  input: FeedbackInput,
) {
  return {
    uid: user.uid,
    name: (user.displayName ?? '').slice(0, 200),
    email: user.email ?? '',
    kind: input.kind,
    message: input.message.trim().slice(0, MAX_FEEDBACK),
    page: (input.page ?? '').slice(0, 2000),
    device: (input.device ?? '').slice(0, 1000),
    status: 'new' as const,
  };
}

/** Sends a note. Like every write it lands in the local cache first, so it works offline. */
export function sendFeedback(input: FeedbackInput): void {
  const user = useAuthStore.getState().user;
  if (!user || !input.message.trim()) return;
  const { db } = getFirebase();
  addDoc(collection(db, paths.feedback()), {
    ...feedbackData(user, input),
    createdAt: serverTimestamp(),
  }).catch((err: unknown) => console.error('Could not send the feedback', err));
  trackPendingWrites();
}

export function setFeedbackStatus(id: string, status: FeedbackNote['status']): void {
  updateDoc(doc(getFirebase().db, paths.feedbackNote(id)), { status }).catch((err: unknown) =>
    console.error('Could not update the feedback', err),
  );
  trackPendingWrites();
}

/** Deletes a note for good. Returns an undo. */
export function deleteFeedback(note: FeedbackNote): () => void {
  const { db } = getFirebase();
  const { id, ...data } = note;
  deleteDoc(doc(db, paths.feedbackNote(id))).catch((err: unknown) =>
    console.error('Could not delete the feedback', err),
  );
  trackPendingWrites();
  return () => {
    setDoc(doc(db, paths.feedbackNote(id)), data).catch((err: unknown) =>
      console.error('Could not restore the feedback', err),
    );
    trackPendingWrites();
  };
}

/** Every note, newest first. Only works for the admin; everyone else gets an error. */
export function useFeedback(): Live<FeedbackNote[]> {
  const uid = useAuthStore((s) => s.user?.uid);
  return useListener<FeedbackNote[]>(uid ? `feedback:${uid}` : null, (onData, onError) =>
    onSnapshot(
      query(collection(getFirebase().db, paths.feedback())),
      (snap) =>
        onData(
          snap.docs
            .map((d) => ({ ...(d.data() as Omit<FeedbackNote, 'id'>), id: d.id }))
            .sort(
              (a, b) =>
                (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now()),
            ),
        ),
      onError,
    ),
  );
}

/**
 * Whether this account can read the inbox. The rules decide, so this just
 * tries a one-note read from the server; offline it stays false.
 */
export function useIsFeedbackAdmin(): boolean {
  const uid = useAuthStore((s) => s.user?.uid);
  const [admin, setAdmin] = useState<{ uid: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    getDocsFromServer(query(collection(getFirebase().db, paths.feedback()), limit(1))).then(
      () => live && setAdmin({ uid, ok: true }),
      () => live && setAdmin({ uid, ok: false }),
    );
    return () => {
      live = false;
    };
  }, [uid]);
  return !!admin && admin.uid === uid && admin.ok;
}

/** The page and browser, to help reproduce a problem. */
export function deviceInfo(): { page: string; device: string } {
  return {
    page: window.location.pathname + window.location.search,
    device: `${navigator.userAgent} · ${window.innerWidth}×${window.innerHeight}`,
  };
}
