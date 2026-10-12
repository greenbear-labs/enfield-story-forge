import { selectSyncState, useSyncStore } from '../lib/firestore/sync';

const LABELS = {
  synced: { text: 'Synced', title: 'All changes are saved to the cloud.', color: 'var(--brand)' },
  saving: {
    text: 'Saving…',
    title: 'Saved on this device. Syncing now.',
    color: 'var(--sec-shard)',
  },
  offline: {
    text: 'Offline',
    title: 'You’re offline. Changes save on this device and sync when you’re back.',
    color: 'var(--muted)',
  },
} as const;

export function SyncIndicator() {
  const state = useSyncStore(selectSyncState);
  const { text, title, color } = LABELS[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.78rem] text-muted"
      title={title}
      aria-label={`Sync status: ${text}`}
      data-state={state}
    >
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="max-sm:hidden">{text}</span>
    </span>
  );
}
