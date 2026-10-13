import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import {
  deleteFeedback,
  FEEDBACK_KINDS,
  setFeedbackStatus,
  useFeedback,
  type FeedbackNote,
} from './feedback';

const FILTERS = [
  { key: 'new', label: 'New' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];

/** Notes people sent with "Send feedback". Only the admin can open it. */
export function FeedbackInboxPage() {
  const notes = useFeedback();
  const [filter, setFilter] = useState<Filter>('new');
  const shown = notes.data?.filter((n) => filter === 'all' || n.status === filter) ?? [];
  const newCount = notes.data?.filter((n) => n.status === 'new').length ?? 0;

  return (
    <div data-sec="home" className="flex flex-col gap-[22px]">
      <header className="sthead">
        <div className="badge">
          <Icon name="chat" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Admin</div>
          <h1>Feedback inbox</h1>
          <p className="mt-1 max-w-[62ch]">
            Notes people sent from the account menu, newest first.
            {notes.data && ` ${newCount} new.`}
          </p>
        </div>
        <div />
      </header>

      {notes.error ? (
        <EmptyState>
          Only the admin can read feedback, and it needs a connection. If that’s you, check that the
          latest Firestore rules are published.
        </EmptyState>
      ) : !notes.data ? (
        <Loading />
      ) : (
        <section className="flex flex-col gap-3" aria-label="Notes">
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="seg"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <EmptyState>
              {filter === 'new' ? 'You’re all caught up.' : 'No notes here yet.'}
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((n) => (
                <FeedbackItem key={n.id} note={n} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function FeedbackItem({ note }: { note: FeedbackNote }) {
  const kind = FEEDBACK_KINDS.find((k) => k.key === note.kind)?.label ?? note.kind;
  const when = note.createdAt?.toDate().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const remove = () => {
    const undo = deleteFeedback(note);
    toast('Note deleted.', { action: { label: 'Undo', onClick: undo } });
  };
  return (
    <li
      className={`panel flex flex-col gap-2 ${note.status === 'new' ? 'border-l-4 border-l-accent' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{kind}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {note.name || note.email || 'Someone'}
          {note.name && note.email && (
            <span className="font-normal text-muted"> · {note.email}</span>
          )}
        </span>
        <span className="text-[0.8rem] text-muted">{when ?? 'Sending…'}</span>
      </div>
      <p className="text-[0.95rem] break-words whitespace-pre-wrap">{note.message}</p>
      {(note.page || note.device) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-[0.78rem] text-muted">
          {note.page && (
            <>
              <dt>Page</dt>
              <dd className="min-w-0 font-mono break-all">{note.page}</dd>
            </>
          )}
          {note.device && (
            <>
              <dt>Device</dt>
              <dd className="min-w-0 break-words">{note.device}</dd>
            </>
          )}
        </dl>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {note.status === 'new' ? (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setFeedbackStatus(note.id, 'done')}
          >
            <Icon name="check" size={14} />
            Mark done
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setFeedbackStatus(note.id, 'new')}
          >
            Mark as new
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-small" onClick={remove}>
          <Icon name="trash" size={14} />
          Delete
        </button>
      </div>
    </li>
  );
}
