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
    stations/       StationPage template, ToolCard, station content
    appendix/       the Appendix: craft articles as data (articles.ts), article pages, InfoLink (i) links
    shards/         Story Shards: quick capture, library, shard page, Shard Mines, groups, Spark Prompts
    concepts/       Concepts: Concept Bank, Concept Generator (option pools as data), the Mashup, concept page, shards → concept
    outlines/       Outline Builder: New Outline, Story Spine, Beat Board, structure library (data), series
    characters/     Character Center: the cast, character page (core card + modules), Quick Card, Character Interview, Archetype Spark (pools as data)
    desk/           Writer's Desk: manuscripts, Send to Writer's Desk, chapters (Chapter Builder), scene cards, Scene Desk (TipTap prose editor, lazy-loaded; focus mode), plotlines and the Chapter Breakdown grid
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
- **Everything is an entry.** Use `src/lib/entries` (`createEntry`, `updateEntry`, `trashEntry`, `addLink`, and the `useEntries` / `useEntry` / `useLinks` hooks) rather than raw Firestore calls in features. Deleting is a soft delete (`deletedAt`), with an Undo toast. An outline is a `book` entry (its series is its parent); beat notes are kept per structure in `fields.beatNotes`. On the Writer's Desk a book's chapters are `chapter` entries (parent: the book) and a chapter's scenes are `scene` entries (parent: the chapter), both ordered by `order` (sort with `byOrder`); `fields.onDesk` marks a book that has been sent to the Desk. A scene's prose is its body (TipTap JSON in `bodies/{sceneId}`, via `saveBody` / `useBody`), and its word count is kept on the scene as `wordCount`. A book's plotlines are `plotline` entries (parent: the book; `fields.color` is a section key, `fields.mice`), and a scene carries a plotline through a `plotline` link (scene → plotline). Links have deterministic ids (`from__kind__to`); a shard group's shards are `member` links, a concept's shards or groups (and a character's shards) are `source` links, an outline's concept is a `source` link, and a character's relationships are `related` links with the note kept on the character (`fields.relations`).
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
