"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";
import { createGoogleProvider, getFirebaseAuth, isFirebaseAuthConfigured } from "@/lib/firebaseClient";

// Popup sign-in fails in browsers that restrict third-party storage: the
// account is created on the auth server but the client never receives the
// credential. These codes mean "the popup channel broke", not "the user
// changed their mind", so we retry automatically via full-page redirect.
const POPUP_CHANNEL_FAILURE_CODES = new Set([
  "auth/popup-blocked",
  "auth/internal-error",
  "auth/timeout",
  "auth/web-storage-unsupported",
  "auth/operation-not-supported-in-this-environment"
]);

export interface AuthState {
  isConfigured: boolean;
  isLoading: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isFirebaseAuthConfigured());

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    // Completes a redirect-based sign-in after the browser navigates back.
    void getRedirectResult(auth).catch((error) => {
      console.error("[allpath] auth_redirect_error", (error as { code?: string })?.code, error);
    });

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const signInWithGoogleRedirect = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }
    await signInWithRedirect(auth, createGoogleProvider());
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    try {
      await signInWithPopup(auth, createGoogleProvider());
    } catch (error) {
      const code = (error as { code?: string })?.code ?? "";
      if (POPUP_CHANNEL_FAILURE_CODES.has(code)) {
        await signInWithRedirect(auth, createGoogleProvider());
        return;
      }
      throw error;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      return null;
    }
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  return {
    isConfigured: isFirebaseAuthConfigured(),
    isLoading,
    user,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    getIdToken
  };
}

export async function buildAuthHeaders(getIdToken: () => Promise<string | null>): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
