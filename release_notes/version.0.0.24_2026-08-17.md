# AllPath v0.0.24 (2026-08-17)

## Fixes

### Google Sign-In Reliability
- Google sign-in now falls back to a full-page **redirect** when the popup
  channel fails (`auth/popup-blocked`, `auth/internal-error`, `auth/timeout`,
  unsupported web storage). Popups break in browsers that restrict
  third-party storage — the account gets created on the auth server while the
  browser never receives the credential, which surfaced as
  "Sign-in failed" on an account that in fact already existed.
- Redirect results are now completed on page load (`getRedirectResult`).
- After any popup failure the modal offers **"Retry without a popup"**, so a
  blocked popup is never a dead end.

### Clearer Sign-In Errors
- An account created with Google has no password, so email/password sign-in
  on it can never succeed. Both "incorrect email or password" and
  "email already registered" now point the user at **Continue with Google**
  instead of implying a wrong password.
- Underlying Firebase error codes are logged to the console for diagnosis.
