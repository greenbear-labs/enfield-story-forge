import { useState, type FormEvent, type RefObject } from 'react';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { deleteSnapshot, restoreSnapshot, saveSnapshot } from '../../lib/entries/entries';
import { useSnapshots } from '../../lib/entries/hooks';
import { proseText } from '../../lib/entries/prose';
import { useAuthStore } from '../auth/authStore';
import type { ProseHandle } from './ProseEditor';

const when = (d: Date) =>
  d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Snapshots: copies of a scene's prose kept by hand, to try a big rewrite
 * without losing the version that worked. Restoring first keeps a copy of
 * the current text, so nothing is ever lost.
 */
export function SnapshotsPanel({
  sceneId,
  editor,
}: {
  sceneId: string;
  editor: RefObject<ProseHandle | null>;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const snapshots = useSnapshots(sceneId);
  const [note, setNote] = useState('');

  const take = (e: FormEvent) => {
    e.preventDefault();
    const now = editor.current?.current();
    if (!now) return;
    saveSnapshot(ws, sceneId, now.doc, now.words, note);
    setNote('');
    toast('Snapshot saved.');
  };

  const restore = (doc: Record<string, unknown>, label: string) => {
    const now = editor.current?.current();
    if (!now) return;
    saveSnapshot(ws, sceneId, now.doc, now.words, 'Before restoring an earlier version');
    editor.current?.replace(doc);
    toast(`Restored the snapshot from ${label}. The text you had is saved as a snapshot too.`);
  };

  return (
    <section aria-label="Snapshots" className="flex flex-col gap-2 border-t border-line pt-3">
      <h3 className="label">Snapshots</h3>
      <form className="flex gap-1.5" onSubmit={take}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Snapshot note</span>
          <input
            className="txt w-full"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-small flex-none">
          Save snapshot
        </button>
      </form>
      {snapshots.data && snapshots.data.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {snapshots.data.map((s) => {
            const label = when(s.createdAt.toDate());
            const text = proseText(s.doc).trim();
            return (
              <li key={s.id} className="rounded-md border border-line p-2 text-[0.82rem]">
                <details>
                  <summary className="cursor-pointer">
                    <span className="font-semibold">{label}</span>
                    <span className="text-muted"> · {(s.words ?? 0).toLocaleString()} words</span>
                    {s.note && <span className="block text-muted">{s.note}</span>}
                  </summary>
                  <p className="mt-1.5 line-clamp-6 font-display whitespace-pre-line">
                    {text || 'Empty.'}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => restore(s.doc, label)}
                    >
                      Restore this version
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small ml-auto"
                      aria-label={`Delete the snapshot from ${label}`}
                      onClick={() => {
                        deleteSnapshot(ws, sceneId, s.id);
                        toast('Snapshot deleted.', {
                          action: { label: 'Undo', onClick: () => restoreSnapshot(ws, s) },
                        });
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        snapshots.data && (
          <p className="text-[0.82rem] text-muted">
            None yet. Save one before a big change, and you can always go back.
          </p>
        )
      )}
    </section>
  );
}
