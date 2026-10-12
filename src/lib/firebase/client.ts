import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, isFirebaseConfigured } from './config';

// Analytics is intentionally not used. Don't import firebase/analytics.

interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let client: FirebaseClient | undefined;

/** Lazily creates the Firebase app, with Firestore's offline cache shared across tabs. */
export function getFirebase(): FirebaseClient {
  if (client) return client;
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Copy .env.example to .env.local.');
  }
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // Optional entry fields can be left undefined instead of being stripped by hand.
    ignoreUndefinedProperties: true,
  });
  client = { app, auth, db };
  return client;
}

let storage: FirebaseStorage | undefined;

/** Firebase Storage, where images live. Unlike Firestore it has no offline cache. */
export function getImageStorage(): FirebaseStorage {
  storage ??= getStorage(getFirebase().app);
  return storage;
}
