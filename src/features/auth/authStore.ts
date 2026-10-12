import { onAuthStateChanged, type User } from 'firebase/auth';
import { create } from 'zustand';
import { getFirebase } from '../../lib/firebase/client';
import { isFirebaseConfigured } from '../../lib/firebase/config';
import { ensurePersonalWorkspace } from '../../lib/firestore/workspace';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthState {
  status: 'loading' | 'signedIn' | 'signedOut';
  user: AuthUser | null;
  workspaceId: string | null;
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  user: null,
  workspaceId: null,
}));

const toAuthUser = (u: User): AuthUser => ({
  uid: u.uid,
  email: u.email,
  displayName: u.displayName,
  photoURL: u.photoURL,
});

let started = false;

/** Start listening to Firebase Auth. Call once at startup. */
export function initAuth(): void {
  if (started) return;
  started = true;
  if (!isFirebaseConfigured) {
    console.error('Firebase env vars are missing; sign-in is unavailable.');
    useAuthStore.setState({ status: 'signedOut' });
    return;
  }
  onAuthStateChanged(getFirebase().auth, (fbUser) => {
    if (!fbUser) {
      useAuthStore.setState({ status: 'signedOut', user: null, workspaceId: null });
      return;
    }
    // The personal workspace id is the uid, so the app can start before the check finishes.
    useAuthStore.setState({
      status: 'signedIn',
      user: toAuthUser(fbUser),
      workspaceId: fbUser.uid,
    });
    ensurePersonalWorkspace(fbUser.uid).catch((err: unknown) =>
      // Offline on a brand-new device: we'll try again on the next sign-in.
      console.warn('Could not check the workspace yet', err),
    );
  });
}

/** Resolves once Firebase has told us whether someone is signed in. */
export function authReady(): Promise<AuthState> {
  const current = useAuthStore.getState();
  if (current.status !== 'loading') return Promise.resolve(current);
  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.status !== 'loading') {
        unsubscribe();
        resolve(state);
      }
    });
  });
}
