import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  backupAge,
  backupSummary,
  BACKUP_VERSION,
  encodeBackup,
  parseBackup,
  restoreCounts,
  type Backup,
} from './backup';

const when = Timestamp.fromDate(new Date('2026-10-01T10:00:00.000Z'));

const backup = (): Backup => ({
  app: 'Enfield Story Forge',
  version: BACKUP_VERSION,
  exportedAt: '2026-10-13T12:00:00.000Z',
  entries: [
    { id: 'c1', type: 'character', title: 'Mira', createdAt: when, deletedAt: null },
    { id: 's1', type: 'scene', title: 'Opening', wordCount: 1200, createdAt: when },
    { id: 's2', type: 'scene', title: 'Gone', wordCount: 50, deletedAt: when },
  ],
  links: [{ id: 'c1__cast__b1', kind: 'cast', fromId: 'c1', toId: 'b1' }],
  bodies: [{ id: 's1', entryId: 's1', doc: { type: 'doc', content: [] }, updatedAt: when }],
  snapshots: [{ id: 'n1', entryId: 's1', note: 'before the rewrite', createdAt: when }],
  writingDays: [{ id: '2026-10-12', date: '2026-10-12', words: 900 }],
  settings: [{ id: 'writing', dailyGoal: 750 }],
});

describe('backups', () => {
  it('round-trips everything, timestamps included', () => {
    const back = parseBackup(encodeBackup(backup()));
    expect(back.entries[0]!.createdAt).toBeInstanceOf(Timestamp);
    expect((back.entries[0]!.createdAt as Timestamp).isEqual(when)).toBe(true);
    expect(back.entries[0]!.deletedAt).toBeNull();
    expect(back.snapshots[0]).toMatchObject({ entryId: 's1', note: 'before the rewrite' });
    expect((back.bodies[0]!.updatedAt as Timestamp).isEqual(when)).toBe(true);
    expect(back.settings).toEqual([{ id: 'writing', dailyGoal: 750 }]);
    expect(encodeBackup(back)).toBe(encodeBackup(backup()));
  });

  it('reads the older JSON export, where times were plain strings', () => {
    const old = JSON.stringify({
      app: 'Enfield Story Forge',
      version: 1,
      entries: [
        {
          id: 'c1',
          type: 'character',
          title: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
      ],
      links: [],
      bodies: [],
    });
    const back = parseBackup(old);
    expect(back.version).toBe(1);
    expect((back.entries[0]!.updatedAt as Timestamp).isEqual(when)).toBe(true);
    // Only time fields turn into timestamps.
    expect(back.entries[0]!.title).toBe('2026-10-01T10:00:00.000Z');
    expect(back.snapshots).toEqual([]);
  });

  it('says plainly when a file isn’t a backup', () => {
    expect(() => parseBackup('not json')).toThrow(/isn’t a Story Forge backup/);
    expect(() => parseBackup('{"app":"Other","entries":[]}')).toThrow(/isn’t a Story Forge backup/);
    expect(() => parseBackup(JSON.stringify({ ...backup(), version: BACKUP_VERSION + 1 }))).toThrow(
      /newer version/,
    );
  });

  it('sums up what’s inside, leaving out the trash', () => {
    expect(backupSummary(backup())).toEqual([
      { label: 'character', count: 1 },
      { label: 'scene', count: 1 },
      { label: 'words', count: 1200 },
      { label: 'snapshot', count: 1 },
    ]);
    expect(restoreCounts(backup(), new Set(['c1', 'x']))).toEqual({ added: 2, replaced: 1 });
  });

  it('says how long ago the last backup was', () => {
    const now = new Date('2026-10-13T09:00:00');
    expect(backupAge(new Date('2026-10-13T01:00:00'), now)).toBe('today');
    expect(backupAge(new Date('2026-10-12T23:00:00'), now)).toBe('yesterday');
    expect(backupAge(new Date('2026-10-01T12:00:00'), now)).toBe('12 days ago');
  });
});
