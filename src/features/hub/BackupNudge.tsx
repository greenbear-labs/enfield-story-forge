import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { backupAge, downloadBackup, useLastBackup } from '../../lib/entries/backup';
import { useAuthStore } from '../auth/authStore';

/** Backups older than this get a gentle reminder on the Hub. */
const REMIND_AFTER_DAYS = 14;
/** Not worth a reminder until there's something to lose. */
const MIN_ENTRIES = 10;

/** A one-line reminder to download a backup, when the last one is old (or there isn't one). */
export function BackupNudge({ entryCount }: { entryCount: number }) {
  const ws = useAuthStore((s) => s.workspaceId);
  const last = useLastBackup();
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  if (!ws || last.data === undefined || entryCount < MIN_ENTRIES) return null;
  if (last.data && now - last.data.getTime() < REMIND_AFTER_DAYS * 24 * 60 * 60 * 1000) return null;

  const backUp = async () => {
    setBusy(true);
    try {
      await downloadBackup(ws);
      toast('Backup downloaded. Keep it somewhere safe.');
    } catch (err) {
      console.error('Backup failed', err);
      toast('Couldn’t make the backup. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel flex flex-wrap items-center gap-3 py-2.5 text-[0.9rem]">
      <Icon name="download" className="text-accent" />
      <span className="min-w-0 flex-1">
        {last.data
          ? `Your last backup was ${backupAge(last.data)}.`
          : 'You haven’t made a backup yet.'}{' '}
        <span className="text-muted">One file keeps a copy of everything you’ve written.</span>
      </span>
      <button type="button" className="btn btn-small" disabled={busy} onClick={() => void backUp()}>
        Download a backup
      </button>
    </div>
  );
}
