import { waitForPendingWrites } from 'firebase/firestore';
import { create } from 'zustand';
import { getFirebase } from '../firebase/client';

export type SyncState = 'synced' | 'saving' | 'offline';

interface SyncStore {
  online: boolean;
  /** Writes made on this device that the server hasn't confirmed yet. */
  pending: number;
}

export const useSyncStore = create<SyncStore>(() => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
}));

export function selectSyncState(s: SyncStore): SyncState {
  if (!s.online) return 'offline';
  return s.pending > 0 ? 'saving' : 'synced';
}

/** Listen for the browser going on and offline. Returns an unsubscribe function. */
export function watchConnectivity(): () => void {
  const update = () => useSyncStore.setState({ online: navigator.onLine });
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}

/**
 * Call after any Firestore write. The write is already saved on this device;
 * the indicator shows "saving" until the server has it.
 */
export function trackPendingWrites(): void {
  useSyncStore.setState((s) => ({ pending: s.pending + 1 }));
  waitForPendingWrites(getFirebase().db)
    .catch(() => undefined)
    .finally(() => useSyncStore.setState((s) => ({ pending: Math.max(0, s.pending - 1) })));
}
