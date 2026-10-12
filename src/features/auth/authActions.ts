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
  'auth/unauthorized-domain':
    'Google sign-in isn’t allowed on this web address. Use enfield.greenbearlabs.com, or sign in with email.',
  'auth/account-exists-with-different-credential':
    'That email already has an account with a different sign-in method. Sign in with email instead.',
  'auth/web-storage-unsupported':
    'This browser is blocking what Google sign-in needs. Allow cookies for this site, or sign in with email.',
  'auth/operation-not-supported-in-this-environment':
    'Google sign-in doesn’t work in this browser view. Open the site in your browser, or sign in with email.',
};

/**
 * A calm, human message for an auth error. Returns null when the user just
 * closed the popup. Unknown errors include their code, so a report can say
 * what actually went wrong.
 */
export function authErrorMessage(err: unknown): string | null {
  if (err instanceof FirebaseError) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.error('Sign-in failed', err);
    return MESSAGES[err.code] ?? `Something went wrong (${err.code}). Please try again.`;
  }
  console.error('Sign-in failed', err);
  return 'Something went wrong. Please try again.';
}
