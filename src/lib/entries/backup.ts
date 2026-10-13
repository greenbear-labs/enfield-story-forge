import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { useAuthStore } from '../../features/auth/authStore';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { trackPendingWrites } from '../firestore/sync';
import { downloadFile } from './exportData';
import { fireAndTrack } from './entries';
import { useListener, type Live } from './hooks';

/*
 * A full backup of a workspace as one JSON file, and restoring from it.
 * Timestamps are written as {"$time": ISO} so they come back as timestamps.
 * Images stay in Firebase Storage; the backup keeps their links.
 */

type Doc = Record<string, unknown> & { id: string };

export interface Backup {
  app: 'Enfield Story Forge';
  version: number;
  exportedAt: string;
  entries: Doc[];
  links: Doc[];
  bodies: Doc[];
  /** Each with the `entryId` of the entry it belongs to. */
  snapshots: (Doc & { entryId: string })[];
  writingDays: Doc[];
  settings: Doc[];
}

export const BACKUP_VERSION = 2;

/** The parts of a backup, in the order they're shown and restored. */
export const BACKUP_PARTS = [
  'entries',
  'links',
  'bodies',
  'snapshots',
  'writingDays',
  'settings',
] as const;
export type BackupPart = (typeof BACKUP_PARTS)[number];

const isTimestamp = (v: unknown): v is Timestamp =>
  !!v && typeof v === 'object' && typeof (v as Timestamp).toDate === 'function';

/** The backup as JSON text. */
export function encodeBackup(backup: Backup): string {
  return JSON.stringify(
    backup,
    function (this: Record<string, unknown>, key: string, value: unknown) {
      // JSON.stringify calls toJSON before the replacer, so look at the raw value.
      const raw = key ? this[key] : value;
      return isTimestamp(raw) ? { $time: raw.toDate().toISOString() } : value;
    },
    2,
  );
}

const TIME_KEYS = new Set(['createdAt', 'updatedAt', 'deletedAt']);
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;

/** Turns stored times back into timestamps (and, from version 1 files, ISO strings in time fields). */
function revive(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => revive(v));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$time === 'string' && Object.keys(obj).length === 1)
      return Timestamp.fromDate(new Date(obj.$time));
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, revive(v, k)]));
  }
  if (typeof value === 'string' && TIME_KEYS.has(key) && ISO.test(value))
    return Timestamp.fromDate(new Date(value));
  return value;
}

const docsIn = (v: unknown): Doc[] =>
  Array.isArray(v)
    ? v.filter((d): d is Doc => !!d && typeof d === 'object' && typeof d.id === 'string' && !!d.id)
    : [];

/** Reads a backup file's text. Throws with a readable message if it isn't one. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a Story Forge backup.');
  }
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (obj.app !== 'Enfield Story Forge' || !Array.isArray(obj.entries))
    throw new Error('That file isn’t a Story Forge backup.');
  if (typeof obj.version === 'number' && obj.version > BACKUP_VERSION)
    throw new Error('That backup is from a newer version of Story Forge. Reload and try again.');
  const backup = revive(obj) as Record<string, unknown>;
  return {
    app: 'Enfield Story Forge',
    version: typeof obj.version === 'number' ? obj.version : 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    entries: docsIn(backup.entries),
    links: docsIn(backup.links),
    bodies: docsIn(backup.bodies),
    snapshots: docsIn(backup.snapshots).filter(
      (s): s is Doc & { entryId: string } => typeof s.entryId === 'string' && !!s.entryId,
    ),
    writingDays: docsIn(backup.writingDays),
    settings: docsIn(backup.settings),
  };
}

/** How many things a backup holds, for people: entries by type, plus the rest. */
export function backupSummary(b: Backup): { label: string; count: number }[] {
  const live = b.entries.filter((e) => !e.deletedAt);
  const count = (...types: string[]) => live.filter((e) => types.includes(String(e.type))).length;
  const words = live
    .filter((e) => e.type === 'scene')
    .reduce((n, e) => n + (typeof e.wordCount === 'number' ? e.wordCount : 0), 0);
  return [
    { label: 'shard', count: count('shard') },
    { label: 'concept', count: count('concept') },
    { label: 'character', count: count('character') },
    { label: 'outline', count: count('book') },
    { label: 'scene', count: count('scene') },
    { label: 'word', count: words },
    { label: 'world page', count: count('page') },
    { label: 'snapshot', count: b.snapshots.length },
  ]
    .filter((r) => r.count > 0)
    .map((r) => ({ ...r, label: r.count === 1 ? r.label : `${r.label}s` }));
}

/** Of the backup's entries, how many are new here and how many replace one that's here. */
export function restoreCounts(b: Backup, existingIds: Set<string>) {
  const replaced = b.entries.filter((e) => existingIds.has(e.id)).length;
  return { added: b.entries.length - replaced, replaced };
}

/* ----- Reading and writing Firestore ----- */

const rows = (snap: Awaited<ReturnType<typeof getDocs>>): Doc[] =>
  snap.docs.map((d) => ({ ...(d.data() as Record<string, unknown>), id: d.id }));

/** Everything in the workspace (from the local cache when offline). */
export async function readBackup(workspaceId: string): Promise<Backup> {
  const { db } = getFirebase();
  const read = (path: string) => getDocs(collection(db, path)).then(rows);
  const [entries, links, bodies, writingDays, settings] = await Promise.all([
    read(paths.entries(workspaceId)),
    read(paths.links(workspaceId)),
    read(paths.bodies(workspaceId)),
    read(paths.writingDays(workspaceId)),
    read(`${paths.workspace(workspaceId)}/settings`),
  ]);
  // Snapshots are only ever taken of scenes.
  const scenes = entries.filter((e) => e.type === 'scene');
  const snapshots = (
    await Promise.all(
      scenes.map((s) =>
        read(paths.snapshots(workspaceId, s.id)).then((list) =>
          list.map((snap) => ({ ...snap, entryId: s.id })),
        ),
      ),
    )
  ).flat();
  return {
    app: 'Enfield Story Forge',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
    links,
    bodies,
    snapshots,
    writingDays,
    settings: settings.filter((s) => s.id !== 'backup'),
  };
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** Downloads a full backup and remembers when it was made. */
export async function downloadBackup(workspaceId: string): Promise<void> {
  const backup = await readBackup(workspaceId);
  downloadFile(`story-forge-backup-${stamp()}.json`, encodeBackup(backup), 'application/json');
  fireAndTrack(
    setDoc(
      doc(getFirebase().db, paths.backupSettings(workspaceId)),
      { lastBackupAt: Timestamp.now() },
      { merge: true },
    ),
    'remember the backup',
  );
}

/**
 * Writes everything in the backup into the workspace. Items with the same id
 * are replaced by the backup's version; anything not in the backup is left as
 * it is. Writes land in the local cache at once and sync later.
 */
export function restoreBackup(workspaceId: string, b: Backup): void {
  const { db } = getFirebase();
  const writes: [string, Record<string, unknown>][] = [];
  const data = (d: Doc) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'id'));
  // A backup from another account still lands in this one.
  for (const e of b.entries)
    writes.push([paths.entry(workspaceId, e.id), { ...data(e), workspaceId }]);
  for (const l of b.links)
    writes.push([paths.link(workspaceId, l.id), { ...data(l), workspaceId }]);
  for (const body of b.bodies) writes.push([paths.body(workspaceId, body.id), data(body)]);
  for (const s of b.snapshots) {
    const { entryId, ...rest } = data(s) as Record<string, unknown> & { entryId: string };
    writes.push([paths.snapshot(workspaceId, entryId, s.id), { ...rest, entryId }]);
  }
  for (const d of b.writingDays) writes.push([paths.writingDay(workspaceId, d.id), data(d)]);
  for (const s of b.settings)
    if (s.id !== 'backup')
      writes.push([`${paths.workspace(workspaceId)}/settings/${s.id}`, data(s)]);

  // A batch holds at most 500 writes.
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    for (const [path, value] of writes.slice(i, i + 400)) batch.set(doc(db, path), value);
    batch.commit().catch((err: unknown) => console.error('Could not restore the backup', err));
  }
  trackPendingWrites();
}

/** When the last backup was downloaded, or null if never. */
export function useLastBackup(): Live<Date | null> {
  const ws = useAuthStore((s) => s.workspaceId);
  return useListener<Date | null>(ws ? `backupSettings:${ws}` : null, (onData, onError) =>
    onSnapshot(
      doc(getFirebase().db, paths.backupSettings(ws!)),
      (snap) => {
        const at: unknown = snap.data()?.lastBackupAt;
        onData(isTimestamp(at) ? at.toDate() : null);
      },
      onError,
    ),
  );
}

const DAY = 24 * 60 * 60 * 1000;

/** "today", "yesterday", or "12 days ago". */
export function backupAge(at: Date, now = new Date()): string {
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / DAY,
  );
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}
