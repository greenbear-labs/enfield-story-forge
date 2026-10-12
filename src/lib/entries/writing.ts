import { collection, doc, increment, onSnapshot, setDoc } from 'firebase/firestore';
import { useMemo } from 'react';
import { useAuthStore } from '../../features/auth/authStore';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { fireAndTrack } from './entries';
import { useListener, type Live } from './hooks';

/**
 * The writing log: one document per day with the net words written, in total
 * and per book, and a settings document with the daily goal. Increments merge,
 * so saves from two tabs (or offline ones that sync later) add up.
 */

export function recordWords(
  workspaceId: string,
  date: string,
  bookId: string | null,
  delta: number,
) {
  if (!delta) return;
  const data: Record<string, unknown> = { date, words: increment(delta) };
  if (bookId) data.books = { [bookId]: increment(delta) };
  fireAndTrack(
    setDoc(doc(getFirebase().db, paths.writingDay(workspaceId, date)), data, { merge: true }),
    'log the words written',
  );
}

export function setDailyGoal(workspaceId: string, dailyGoal: number) {
  fireAndTrack(
    setDoc(
      doc(getFirebase().db, paths.writingSettings(workspaceId)),
      { dailyGoal },
      { merge: true },
    ),
    'save the daily goal',
  );
}

const useWorkspaceId = () => useAuthStore((s) => s.workspaceId);

/** Words written per day, keyed by date (YYYY-MM-DD). */
export function useWritingDays(): Live<Map<string, number>> {
  const ws = useWorkspaceId();
  const live = useListener<[string, number][]>(ws ? `writingDays:${ws}` : null, (onData, onError) =>
    onSnapshot(
      collection(getFirebase().db, paths.writingDays(ws!)),
      (snap) =>
        onData(
          snap.docs.map((d) => {
            const words: unknown = d.data().words;
            return [d.id, typeof words === 'number' ? words : 0];
          }),
        ),
      onError,
    ),
  );
  const data = useMemo(() => live.data && new Map(live.data), [live.data]);
  return { data, error: live.error };
}

/** The daily goal in words, or undefined while it loads. Null if never set. */
export function useDailyGoal(): Live<number | null> {
  const ws = useWorkspaceId();
  return useListener<number | null>(ws ? `writingSettings:${ws}` : null, (onData, onError) =>
    onSnapshot(
      doc(getFirebase().db, paths.writingSettings(ws!)),
      (snap) => {
        const goal: unknown = snap.data()?.dailyGoal;
        onData(typeof goal === 'number' ? goal : null);
      },
      onError,
    ),
  );
}
