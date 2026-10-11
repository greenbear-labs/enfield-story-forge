import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebase } from '../../lib/firebase/client';

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebase().auth, email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getFirebase().auth, email, password);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebase().auth, email);
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(getFirebase().auth, provider);
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebase().auth);
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/invalid-email': 'That doesn’t look like an email address.',
  'auth/user-disabled': 'This account has been turned off.',
  'auth/email-already-in-use': 'There’s already an account with that email. Try signing in.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'You seem to be offline. Check your connection.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups and try again.',
  'auth/operation-not-allowed': 'This sign-in method isn’t turned on yet.',
};

/** A calm, human message for an auth error. Returns null when the user just closed the popup. */
export function authErrorMessage(err: unknown): string | null {
  if (err instanceof FirebaseError) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return null;
    }
    return MESSAGES[err.code] ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
