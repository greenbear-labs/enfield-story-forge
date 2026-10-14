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
  app/              router, app shell, top bar, station nav, World Creator and Shadow Paths shells, app switcher, theme, navigation config
  features/
    auth/           auth store, auth actions, landing and sign-in pages
    hub/            the Hub, and the first-time welcome tour (tour.ts; put away in `settings/welcome`)
    stations/       StationPage template, ToolCard, station content
    appendix/       the Appendix: craft articles as data (articles.ts), article pages, InfoLink (i) links
    shards/         Story Shards: quick capture, library, shard page, Shard Mines, groups, Spark Prompts
    concepts/       Concepts: Concept Bank, Concept Generator (option pools as data), the Mashup, concept page, shards → concept
    outlines/       Outline Builder: New Outline, Story Spine, Beat Board, structure library (data), your own structures (customStructures.ts; StructurePage), series
    characters/     Character Center: casts and groups, the character library (cards, list, or by cast; filtered by story), character page (core card + modules, Stats), Quick Card, Character Interview, Archetype Spark (pools as data), the Relationship Web (webModel.ts)
    desk/           Writer's Desk: manuscripts, Send to Writer's Desk, chapters (Chapter Builder), scene cards, Scene Desk (TipTap prose editor, lazy-loaded; focus mode), plotlines and the Chapter Breakdown grid, Compile (compile.ts: one manuscript from a book; settings in the book's `fields.compile`; exports work from its `Compiled` result: Markdown, print to PDF, and DOCX and EPUB from bookFiles.ts, zipped by src/lib/zip.ts), writing goals and streaks (writingModel.ts, WritingHabit), Story health (healthModel.ts: pacing, POV balance, gentle checks; knowledgeModel.ts: who knows what), Import a draft (importModel.ts: Word, Markdown, or text into a new manuscript; .docx read with src/lib/unzip.ts)
    world/          Enfield World Creator (its own app at /world): notebooks, indexes (table, gallery, list; custom columns; presets as data), world pages with rich text (/ commands, @links), pages inside pages, the notebook tree (drag to reorder or nest pages; Alt+Up/Down; `planTreeMove` renumbers siblings), and notebook export (Markdown, print or PDF)
    paths/          Enfield Shadow Paths (its own app at /paths, with its own landing at /shadow-paths and sign-in at /shadow-paths/sign-in; always-night look from `.paths-app` tokens and art in public/paths-art/): choose-your-own-adventure stories (`adventure` entries; `fields.blurb`, `fields.categories`, `fields.startId`), the story map (StoryMap.tsx, React Flow, lazy-loaded) and list, the passage panel, story state (stateModel.ts, StateEditor.tsx), story health (healthModel.ts, StoryHealth.tsx), playtest at /paths/$id/play (PlayPage, around the shared Player.tsx; playModel.ts), and publishing (PublishDialog; publishModel.ts, src/lib/entries/publish.ts) with the library at /paths/library (featured first), the reader's page at /paths/read/$id, the profile at /paths/profile (gems, medals, stories played; rewardsModel.ts), and the admin's review at /paths/review (ReviewPage: approve, send back with a note, featured order); sample stories as data in samples/ (sampleModel.ts adds one to a writer's adventures; SampleShelf), and downloads from the adventure's menu (exportModel.ts: one playable HTML file, whose player is storyFilePlayer.ts copied in as source, so `runStory` must stand alone; or a Twine 2 archive in Harlowe 3; src/lib/entries/adventureFiles.ts), and starting an adventure from an outline (outlineAdventure.ts: its beats or chapters become passages in a line; from New adventure or the outline's "Make it a Shadow Paths adventure"; the adventure keeps a `source` link to the outline), and ambient sound (a passage's `fields.sound`: an ambience from soundModel.ts or `silence`; none keeps what was playing; made in the browser with Web Audio in ambience.ts, no files; readers turn it on with SoundToggle, remembered in localStorage); plan in planning/shadow-paths-plan.md
    images/         images on entries: the gallery (EntryGallery), card covers, avatars and thumbnails
    search/         Ctrl+K search over all entries
    feedback/       Send feedback (account menu) and the admin-only Feedback inbox at /feedback; notes live in the top-level `feedback` collection (the admin is set in firestore.rules)
  components/ui/    Icon, Menu, Dialog, TagInput, Toaster/toast (with Undo actions), EmptyState, Loading
  lib/firebase/     config from env, lazy Firebase client
  lib/firestore/    path helpers, workspace bootstrap, sync status
  lib/entries/      the entry engine: create/update/trash/links, live hooks, search, export, full backup and restore (backup.ts; last backup time in `settings/backup`)
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
- **Everything is an entry.** Use `src/lib/entries` (`createEntry`, `updateEntry`, `trashEntry`, `addLink`, and the `useEntries` / `useEntry` / `useLinks` hooks) rather than raw Firestore calls in features. Deleting is a soft delete (`deletedAt`), with an Undo toast. An outline is a `book` entry (its series is its parent); beat notes are kept per structure in `fields.beatNotes`. A writer's own structure is a `structure` entry (`fields.bestFor`, beats in `fields.beats` keyed by id: `{name, part, position 0–1, prompt}`), chosen in an outline as `custom-{entryId}`; `CustomStructuresSync` (in AppShell) loads them so `structureByKey` finds them, and pages that look up structures call `useStructures()` to re-render when they change. On the Writer's Desk a book's chapters are `chapter` entries (parent: the book) and a chapter's scenes are `scene` entries (parent: the chapter), both ordered by `order` (sort with `byOrder`); `fields.onDesk` marks a book that has been sent to the Desk. A scene's prose is its body (TipTap JSON in `bodies/{sceneId}`, via `saveBody` / `useBody`), and its word count is kept on the scene as `wordCount`. A book's plotlines are `plotline` entries (parent: the book; `fields.color` is a section key, `fields.mice`), and a scene carries a plotline through a `plotline` link (scene → plotline). An @mention in a scene's prose (a character or a World Creator page) is a TipTap `mention` node, mirrored as a `mention` link (scene → entry) on save; a scene's place is a `location` link (scene → a World Creator page with the `location` template). "Appears in" (characters) and "Used in Story Forge" (world pages) come from those links plus the scenes where a character is the POV. Each save of a scene's prose adds its net change in words to the day's log (`workspaces/{ws}/writingDays/{YYYY-MM-DD}`, via `recordWords` in `src/lib/entries/writing.ts`); the daily goal is in `settings/writing`, and a book's word count target is `fields.targetWords`. A book's secrets for "who knows what" are `fields.secrets`, keyed by secret id (`fact`, `order`, `reader`, and `learns` by character id; each a chapter id, `start`, or empty). Snapshots of a scene's prose live in `entries/{sceneId}/snapshots` (`saveSnapshot`, `useSnapshots`); restoring one first snapshots the current text. In the World Creator a notebook is a `notebook` entry; its indexes are `index` entries (parent: the notebook; `fields.columns` keyed by column id, `fields.view`, `fields.preset`), and an index's entries are `page` entries (parent: the index; values in `fields.props` by column id, rich text in their body). A page can hold pages (parent: the page), and every page keeps `fields.notebookId`. @links in a world page are `mention` links (page → entry), shown as "Linked from" on the target. A page's `template` comes from its index's preset; places are `location`. Links have deterministic ids (`from__kind__to`); a shard group's shards are `member` links, a concept's shards or groups (and a character's shards) are `source` links, an outline's concept is a `source` link, a character's relationships are `related` links with the note and kind kept on the character (`fields.relations`, `fields.relationKinds`, by the other's id; drawn one line per pair on the Relationship Web at `/characters/web`), a character's stats are `fields.stats` keyed by id (`{name, value, order}`), and a story's cast is `cast` links (character → book, series, or a `cast_group` entry, a group not tied to a story; see `castModel.ts`: a series' cast belongs to each of its books, and a book's protagonist is always in its cast).
- **Shadow Paths:** an adventure's passages are `passage` entries (parent: the adventure): prose in their body (TipTap JSON, @mentions mirrored as `mention` links), map position `fields.pos {x, y}`, private `fields.notes`, and `fields.ending` (`true`, `secret`, `death`, `other`) when it's an ending. A passage's choices are `fields.choices`, keyed by id (`{label, to, order, requires, effects, cost}`, `cost` being gems to unlock it; `to` is a passage id or empty); they aren't mirrored as links, since an adventure's passages are always loaded together (see `pathsModel.ts`). Story state (see `stateModel.ts`): the adventure's `fields.state` keyed by id (`{name, kind: item|flag|counter, start, order}`); a choice's `requires` and `effects` and a passage's `fields.lines` (`{text, when, order}`) hold rules keyed by id (`{var, op, value, order}`). A playthrough is `workspaces/{ws}/plays/{adventureId}` (`path`: passage ids of the current run, last is where the reader is; `via`: the choice taken into each step; `endings`: ending passage id → first found, ms; the state isn't saved, `stateAlong` works it out from the route), via `savePlay` / `usePlay` in `src/lib/entries/plays.ts`. Publishing copies an adventure to the top-level `published/{adventureId}` (`ownerId`, `title`, `blurb`, `categories`, `coverUrl`, `startId`, `state`, `status`: `unlisted` (link only), `submitted` (waiting for review), `public` (in the library; only the admin sets it), or `private`) with its passages in `published/{id}/passages/{passageId}` (`title`, `fields` with only `choices`, `lines`, `ending`; `doc`, the prose; `imageUrl`). Notes and map positions are never copied; readers see changes only when the author updates the copy. The admin's part of a story is `reviewNote` (why it was sent back; cleared when resubmitted), `reviewedAt`, and `featured` (its place in the featured order); an author's update carries these over and the rules stop authors changing them. A reader's playthrough of a published story is `plays/pub_{storyId}`; it also keeps `kinds` (ending id → type), `unlocked` (`passageId:choiceId` → gems spent), and the story's `title` and `total` endings. Gems and medals aren't stored: `rewardsModel.ts` works them out from the reader's `pub_` plays (an ending found for the first time earns gems by type; unlocking a choice spends them; playtests earn and spend nothing). A sample story's adventure has `fields.sample` (its key) and `fields.coverArt` (built-in art from public/paths-art/, used when it has no cover image); its passages can have `fields.coverArt` too (Ashwood, brought over from the old site, has art in public/paths-art/ashwood/). The rules for `published` are in firestore.rules.
- **Images** live in Firebase Storage under `workspaces/{workspaceId}/images/{entryId}/` and are listed on the entry as `images` (`EntryImage`: `storagePath`, the download `url`, size, caption); the cover is `coverImageId`, or the first image. Use `src/lib/entries/images.ts` (`addEntryImage` compresses to WebP at most 1600px and waits for the upload, so it needs a connection; `removeEntryImage` returns an undo and deletes the file once the undo has passed). Show them with `EntryGallery`, `CardCover`, `Avatar`, or `Thumb` from `src/features/images` (scenes have a gallery on the Scene Desk and a thumbnail on their Chapter Builder card). The service worker caches image files for offline use.
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
