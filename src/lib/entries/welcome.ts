import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../../features/auth/authStore';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { fireAndTrack } from './entries';
import { useListener, type Live } from './hooks';

/** Hides (or brings back) the welcome tour on the Hub, on every device. */
export function setWelcomeDismissed(workspaceId: string, dismissed: boolean) {
  fireAndTrack(
    setDoc(
      doc(getFirebase().db, paths.welcomeSettings(workspaceId)),
      { dismissed },
      { merge: true },
    ),
    'save the welcome tour setting',
  );
}

/** Whether the welcome tour was put away. */
export function useWelcomeDismissed(): Live<boolean> {
  const ws = useAuthStore((s) => s.workspaceId);
  return useListener<boolean>(ws ? `welcomeSettings:${ws}` : null, (onData, onError) =>
    onSnapshot(
      doc(getFirebase().db, paths.welcomeSettings(ws!)),
      (snap) => onData(snap.data()?.dismissed === true),
      onError,
    ),
  );
}
