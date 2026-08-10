import { App, applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

export interface AuthUser {
  uid: string;
  email?: string;
}

declare global {
  // Keep the admin app stable across Next.js dev hot reloads.
  // eslint-disable-next-line no-var
  var __allpathFirebaseAdmin: App | undefined;
}

function getAdminApp(): App {
  if (!globalThis.__allpathFirebaseAdmin) {
    globalThis.__allpathFirebaseAdmin =
      getApps()[0] ??
      initializeApp({
        credential: applicationDefault(),
        projectId:
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.GCLOUD_PROJECT ||
          undefined
      });
  }

  return globalThis.__allpathFirebaseAdmin;
}

// Resolves the signed-in user from an "Authorization: Bearer <idToken>" header.
// Returns null on any failure — endpoints treat missing/invalid auth as guest.
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    return null;
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email ?? undefined };
  } catch {
    return null;
  }
}
