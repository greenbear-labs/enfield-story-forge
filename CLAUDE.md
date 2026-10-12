# Enfield Story Forge

A writing studio web app: a hub of connected workshops that takes a writer from story shards to concepts, outlines, and a finished manuscript. Hosted on Vercel at https://enfield.greenbearlabs.com.

## Roles

- **Claude** writes all the code, in small PRs. Each PR gets a Vercel preview link.
- **Alex** (owner) does UX and testing, reviews the previews, and makes the decisions. Ask when a product choice is unclear rather than guessing.

## Planning docs

The planning docs live in `/mnt/project-files/planning/`. They're **outside this repo** and read-only. Start with:

- `studio-structure-v3.md`: the information architecture (hub, stations, tools). It wins over older docs.
- `v1-spec-and-data-model.md`: the stack, screens, and the entry and link data model.
- `story-forge-execution-plan.md`: the phases.

## Stack

React 19 + TypeScript (strict) + Vite 8, TanStack Router (code-based routes in `src/app/router.tsx`), Tailwind CSS 4, Zustand, Firebase (Auth, plus Firestore with the persistent multi-tab offline cache; no Analytics), vite-plugin-pwa, Vitest + Testing Library, Playwright, ESLint + Prettier.

## Folders

```
src/
  app/              router, app shell, top bar, station nav, theme, navigation config
  features/
    auth/           auth store, auth actions, landing and sign-in pages
    hub/            the Hub
    stations/       StationPage template, ToolCard, station content, Appendix
    shards/         Story Shards: quick capture, library, shard page, Shard Mines, groups, Spark Prompts
    concepts/       Concepts: Concept Bank, Concept Generator (option pools as data), concept page, shards → concept
    search/         Ctrl+K search over all entries
  components/ui/    Icon, Menu, Dialog, TagInput, Toaster/toast (with Undo actions), EmptyState, Loading
  lib/firebase/     config from env, lazy Firebase client
  lib/firestore/    path helpers, workspace bootstrap, sync status
  lib/entries/      the entry engine: create/update/trash/links, live hooks, search, export
  data/types/       Entry, EntryBody, Link, Snapshot, Workspace, Section
  styles/           tokens.css (wireframe tokens), index.css (Tailwind + components)
e2e/                Playwright smoke tests
firestore.rules, storage.rules, firebase.json   security rules (deploy with the Firebase CLI)
```

## Conventions

- **Section colors = entry type.** Each workshop has one accent (`shard`, `concept`, `story`, `desk`, `char`, `world`, `learn`, `home`). Put `data-sec="..."` on an element and `--accent` / `--accent-soft` (Tailwind: `text-accent`, `bg-accent-soft`) follow. `ENTRY_SECTION` maps entry types to sections. Don't hard-code colors; use the tokens so light and dark both work.
- **Every station uses `StationPage`**: header (eyebrow, title, blurb, (i) link to the Appendix), tools, optional collections, library.
- **AI buttons are present but inactive** (`btn btn-ai`), with a placeholder message. No AI calls in v1.
- **Offline-first.** Firestore writes go to the local cache immediately; don't block the UI on the server. Call `trackPendingWrites()` after writes so the sync indicator is honest.
- **Data lives under `workspaces/{workspaceId}/...`** (see `src/lib/firestore/paths.ts`). The personal workspace id is the user's uid.
- **Everything is an entry.** Use `src/lib/entries` (`createEntry`, `updateEntry`, `trashEntry`, `addLink`, and the `useEntries` / `useEntry` / `useLinks` hooks) rather than raw Firestore calls in features. Deleting is a soft delete (`deletedAt`), with an Undo toast. Links have deterministic ids (`from__kind__to`); a shard group's shards are `member` links, and a concept's shards or groups are `source` links.
- **No screenplay formatting**, ever.
- Keep the UI simple and calm, matching the v3 wireframe. Check phone width (390px): no horizontal page scroll.
- Never ship auth bypasses or test-only hooks in `src/`.

## Commands

```
npm run dev         # Vite dev server (needs .env.local; copy .env.example)
npm run typecheck   # tsc -b
npm run lint        # ESLint
npm test            # Vitest unit tests
npm run build       # production build (dist/)
npm run test:e2e    # build, then Playwright against vite preview
npm run format      # Prettier
```

In the Claude sandbox, Chromium is preinstalled: run Playwright with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` and never run `playwright install` locally. CI installs its own Chromium.
