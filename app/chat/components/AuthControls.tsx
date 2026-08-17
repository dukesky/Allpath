"use client";

import { FormEvent, useState } from "react";
import type { AuthState } from "./useAuth";

function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  // Keep the raw error visible for debugging intermittent sign-in issues.
  console.error("[allpath] auth_error", code, error);
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      // Email enumeration protection makes these indistinguishable, and an
      // account created via Google has no password at all — so point at the
      // Google button instead of insisting the password is wrong.
      return "Incorrect email or password. If you signed up with Google, use “Continue with Google” above.";
    case "auth/email-already-in-use":
      return "This email is already registered — if you signed up with Google, use “Continue with Google” above.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and retry.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Check your connection and retry.";
    default:
      return `Sign-in failed${code ? ` (${code})` : ""}. Please try again.`;
  }
}

export function AuthControls({ auth }: { auth: AuthState }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRedirectFallback, setShowRedirectFallback] = useState(false);

  if (!auth.isConfigured) {
    return null;
  }

  if (auth.isLoading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" aria-hidden />;
  }

  if (auth.user) {
    const label = auth.user.displayName || auth.user.email || "Account";
    const initial = label.charAt(0).toUpperCase();
    return (
      <div className="relative">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-sm font-semibold text-white"
          onClick={() => setIsMenuOpen((open) => !open)}
          title={label}
        >
          {auth.user.photoURL ? (
            <img alt={label} className="h-full w-full object-cover" src={auth.user.photoURL} />
          ) : (
            initial
          )}
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <p className="truncate text-xs font-medium text-slate-700">{label}</p>
            {auth.user.email && <p className="truncate text-[11px] text-slate-500">{auth.user.email}</p>}
            <p className="mt-1 text-[11px] text-emerald-600">Sessions sync to your account</p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              onClick={async () => {
                setIsMenuOpen(false);
                await auth.signOutUser();
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  async function submitEmailForm(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      if (mode === "sign_in") {
        await auth.signInWithEmail(email.trim(), password);
      } else {
        await auth.signUpWithEmail(email.trim(), password);
      }
      setIsModalOpen(false);
      setEmail("");
      setPassword("");
    } catch (error) {
      setFormError(describeAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500"
        onClick={() => {
          setFormError("");
          setIsModalOpen(true);
        }}
      >
        Sign in
      </button>
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-800">
              {mode === "sign_in" ? "Sign in to AllPath" : "Create your AllPath account"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Keep your sessions saved to your account and continue them from any device.
            </p>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={async () => {
                setFormError("");
                setShowRedirectFallback(false);
                try {
                  await auth.signInWithGoogle();
                  setIsModalOpen(false);
                } catch (error) {
                  // The popup channel can break even when the account is
                  // created server-side; offer the redirect route as a way out.
                  setFormError(
                    describeAuthError(error) ||
                      "The Google sign-in window closed before finishing."
                  );
                  setShowRedirectFallback(true);
                }
              }}
            >
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M21.35 11.1h-9.17v2.98h5.3c-.23 1.24-.93 2.29-1.99 3v2.49h3.22c1.89-1.74 2.98-4.3 2.98-7.34 0-.7-.06-1.22-.34-1.13z"
                  fill="#4285F4"
                />
                <path
                  d="M12.18 22c2.7 0 4.96-.89 6.62-2.42l-3.22-2.49c-.9.6-2.04.96-3.4.96-2.62 0-4.83-1.76-5.62-4.14H3.24v2.57A9.99 9.99 0 0 0 12.18 22z"
                  fill="#34A853"
                />
                <path
                  d="M6.56 13.91a5.98 5.98 0 0 1 0-3.82V7.52H3.24a9.99 9.99 0 0 0 0 8.96l3.32-2.57z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.18 5.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86C17.13 2.99 14.88 2 12.18 2A9.99 9.99 0 0 0 3.24 7.52l3.32 2.57c.79-2.38 3-4.13 5.62-4.13z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            {showRedirectFallback && (
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                onClick={async () => {
                  setFormError("");
                  try {
                    await auth.signInWithGoogleRedirect();
                  } catch (error) {
                    setFormError(describeAuthError(error));
                  }
                }}
              >
                Retry without a popup (redirects this page)
              </button>
            )}
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <form className="space-y-3" onSubmit={submitEmailForm}>
              <input
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
                type="email"
                value={email}
              />
              <input
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                type="password"
                value={password}
              />
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <button
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Please wait…" : mode === "sign_in" ? "Sign in" : "Sign up"}
              </button>
            </form>
            <button
              type="button"
              className="mt-3 w-full text-center text-xs text-indigo-600 hover:underline"
              onClick={() => {
                setFormError("");
                setMode((current) => (current === "sign_in" ? "sign_up" : "sign_in"));
              }}
            >
              {mode === "sign_in" ? "New to AllPath? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
