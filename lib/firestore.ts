import { Firestore } from "@google-cloud/firestore";

declare global {
  // Keep Firestore stable across hot reloads in dev.
  // eslint-disable-next-line no-var
  var __allpathFirestore: Firestore | undefined;
}

export function getFirestoreDb(): Firestore {
  if (!globalThis.__allpathFirestore) {
    globalThis.__allpathFirestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || undefined,
      databaseId: process.env.FIRESTORE_DATABASE_ID?.trim() || undefined
    });
  }

  return globalThis.__allpathFirestore;
}
