import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

import { readFirebaseConfig } from './firebaseConfig';

let db: Firestore | undefined;

// Lazy initialization keeps public market pages usable without Firebase.
export function getDb(): Firestore {
  if (!db) {
    const { config, databaseId } = readFirebaseConfig(import.meta.env);
    const app = getApps().length ? getApp() : initializeApp(config);
    db = getFirestore(app, databaseId);
  }
  return db;
}
