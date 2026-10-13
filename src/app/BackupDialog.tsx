import { useState, type ChangeEvent } from 'react';
import { Dialog } from '../components/ui/Dialog';
import { Icon } from '../components/ui/Icon';
import { toast } from '../components/ui/toast';
import { useAuthStore } from '../features/auth/authStore';
import {
  backupAge,
  backupSummary,
  downloadBackup,
  encodeBackup,
  parseBackup,
  readBackup,
  restoreBackup,
  restoreCounts,
  useLastBackup,
  type Backup,
} from '../lib/entries/backup';
import { downloadFile } from '../lib/entries/exportData';

/** Download everything as one file, or bring a backup back. */
export function BackupDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const last = useLastBackup();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState<{
    backup: Backup;
    current: Backup;
    name: string;
  } | null>(null);
  const [saveFirst, setSaveFirst] = useState(true);

  const backUp = async () => {
    setBusy(true);
    try {
      await downloadBackup(ws);
      toast('Backup downloaded.');
    } catch (err) {
      console.error('Backup failed', err);
      toast('Couldn’t make the backup. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');
    setRestoring(null);
    if (!file) return;
    setBusy(true);
    try {
      const backup = parseBackup(await file.text());
      const current = await readBackup(ws);
      setRestoring({ backup, current, name: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t read that file.');
    } finally {
      setBusy(false);
    }
  };

  const restore = () => {
    if (!restoring) return;
    if (saveFirst)
      downloadFile(
        `story-forge-before-restore-${new Date().toISOString().slice(0, 10)}.json`,
        encodeBackup(restoring.current),
        'application/json',
      );
    restoreBackup(ws, restoring.backup);
    onClose();
    toast('Backup restored.');
  };

  const counts =
    restoring &&
    restoreCounts(restoring.backup, new Set(restoring.current.entries.map((e) => e.id)));
  const made = restoring?.backup.exportedAt ? new Date(restoring.backup.exportedAt) : null;

  return (
    <Dialog title="Backup and restore" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2" aria-label="Back up">
          <p className="text-[0.9rem] text-muted">
            One file with everything: shards, concepts, characters, outlines, manuscripts, the World
            Creator, snapshots, and your writing log. Keep it somewhere safe, like your computer or
            a cloud drive. Pictures stay online; the backup keeps their links.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void backUp()}
            >
              <Icon name="download" size={16} />
              Download a backup
            </button>
            <span className="text-[0.85rem] text-muted">
              {last.data === undefined
                ? ''
                : last.data
                  ? `Last backup: ${backupAge(last.data)}`
                  : 'No backup yet'}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-2 border-t border-line pt-4" aria-label="Restore">
          <h3 className="text-[1rem]">Restore from a backup</h3>
          <label className="flex flex-col gap-1">
            <span className="label">Backup file</span>
            <input
              type="file"
              accept=".json,application/json"
              className="txt file:mr-3 file:rounded-md file:border-0 file:bg-sunken file:px-3 file:py-1 file:font-semibold"
              onChange={(e) => void choose(e)}
            />
          </label>
          {error && (
            <p role="alert" className="text-[0.9rem] text-accent">
              {error}
            </p>
          )}
          {restoring && counts && (
            <div className="flex flex-col gap-2 rounded-lg bg-sunken p-3">
              <p className="text-[0.9rem] font-semibold">
                {made && !Number.isNaN(made.getTime())
                  ? `Made ${made.toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                  : restoring.name}
              </p>
              <p className="text-[0.85rem] text-muted">
                {backupSummary(restoring.backup)
                  .map((r) => `${r.count.toLocaleString()} ${r.label}`)
                  .join(' · ') || 'Nothing in it yet'}
              </p>
              <p className="text-[0.85rem]">
                {counts.added.toLocaleString()} {counts.added === 1 ? 'item comes' : 'items come'}{' '}
                back.{' '}
                {counts.replaced > 0 &&
                  `${counts.replaced.toLocaleString()} ${counts.replaced === 1 ? 'item that’s' : 'items that are'} here now will go back to the backup’s version. `}
                Anything made since the backup stays.
              </p>
              <label className="flex items-center gap-2 text-[0.85rem]">
                <input
                  type="checkbox"
                  checked={saveFirst}
                  onChange={(e) => setSaveFirst(e.target.checked)}
                />
                Download a backup of what’s here first
              </label>
              <div className="flex justify-end">
                <button type="button" className="btn btn-primary" onClick={restore}>
                  Restore
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Dialog>
  );
}
