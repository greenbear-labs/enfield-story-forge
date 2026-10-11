# Enfield Story Forge

A writing studio that takes a writer from scattered ideas to a finished, organized story. Every story moves through four connected stations (Story Shards, Concepts, Outline Builder, Writer's Desk), with the Character Center and the Enfield World Creator beside them, all sharing one library.

Home: https://enfield.greenbearlabs.com

Status: Phase 0, the foundation (sign-in, the app shell, the Hub, and placeholder station pages). The tools come in later phases.

## Run it

Requires Node 22+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:5173.

Other commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run preview`, and `npm run test:e2e` (builds, then runs the Playwright smoke test).

## Environment variables

The app reads the Firebase web config from these Vite env vars. The values in `.env.example` are the real project's; the Firebase web config is public by design, and access is protected by `firestore.rules` and `storage.rules`.

| Variable                            | Firebase config key |
| ----------------------------------- | ------------------- |
| `VITE_FIREBASE_API_KEY`             | `apiKey`            |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `authDomain`        |
| `VITE_FIREBASE_PROJECT_ID`          | `projectId`         |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `storageBucket`     |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID`              | `appId`             |

On Vercel, set the same variables in the project settings.

## Deploying

- **App:** Vercel builds with `npm run build` and serves `dist/` (see `vercel.json`, which rewrites all routes to `index.html`).
- **Security rules:** `firebase deploy --only firestore:rules,storage` with the Firebase CLI.

## Stack

React, TypeScript, Vite, TanStack Router, Tailwind CSS, Zustand, Firebase Auth and Firestore (offline cache on), vite-plugin-pwa, Vitest, and Playwright.
