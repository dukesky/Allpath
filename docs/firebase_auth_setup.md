# Firebase Auth Setup (one-time)

AllPath v0.0.22 adds sign-in (Google + email/password) and per-account session
persistence. The code ships disabled-by-default: until the
`NEXT_PUBLIC_FIREBASE_*` env vars are set, no sign-in UI is shown and the app
behaves exactly as before. Follow these steps to turn it on.

## 1. Enable Firebase on the existing GCP project

1. Open https://console.firebase.google.com → **Add project** → choose the
   existing GCP project that hosts Cloud Run/Firestore (do NOT create a new
   one). Analytics is optional — you can decline it.
2. In **Build → Authentication → Get started**, enable two sign-in providers:
   - **Google** (pick a support email)
   - **Email/Password** (only the first toggle; "Email link" not needed)
3. In **Authentication → Settings → Authorized domains**, make sure these are
   listed: `localhost`, `all-path.com` (add your Cloud Run `*.run.app` domain
   too if you access it directly).

## 2. Register a Web app and copy the config

1. Project overview → **⚙ Project settings → General → Your apps → Add app →
   Web** (`</>` icon). Name it e.g. `allpath-web`. No hosting needed.
2. Copy the four values from the config snippet into env vars:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
```

- **Local**: add them to `.env.local` and restart `npm run dev`.
- **Cloud Run**: these are public client identifiers (safe to expose), but they
  are baked in at **build time** because of the `NEXT_PUBLIC_` prefix — add
  them to the Docker build (e.g. `--build-arg` + `ENV` in `Dockerfile`, or
  substitutions in `cloudbuild.yaml`), not just the runtime env.

## 3. Server-side (no extra setup expected)

- API routes verify ID tokens with `firebase-admin` using Application Default
  Credentials. On Cloud Run this works with the default service account —
  token verification only downloads Google's public certs, no extra IAM role
  needed.
- Locally it uses your `gcloud auth application-default login` credentials,
  same as Firestore access today.

## 4. What signing in changes

- Sessions are persisted to Firestore under `users/{uid}/sessions/{persistentId}`
  (doc + `messages` subcollection). API keys are **never** stored; attachment
  payloads are stripped.
- The sidebar shows account sessions with a "Saved" badge; opening one after a
  server restart transparently recreates the live session from the stored
  transcript (same `persistentId`).
- If the account has no usable funding (trial/key), the transcript is restored
  read-only with a hint to redeem/add a key.
- Redeeming an invite code (or checking trial status) while signed in links the
  guest trial record to the account (`trial_guests.linkedUid`), and the trial
  cookie is re-issued automatically on new devices.

## 5. Verify

1. `npm run dev`, open `/chat` — a **Sign in** button appears top-right.
2. Sign in with Google; create a session, chat one round.
3. Restart the dev server; reopen the session from the sidebar — history loads
   and the conversation can continue.
4. Check Firestore: `users/{uid}/sessions/...` docs exist and contain no
   `apiKey` fields.
