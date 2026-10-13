import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { Entry } from '../../data/types';
import { setWelcomeDismissed } from '../../lib/entries/welcome';
import { useAuthStore } from '../auth/authStore';
import { TOUR } from './tour';

type TourPath = '/shards' | '/concepts' | '/characters' | '/outlines/new' | '/desk';

const ACTIONS: Record<string, { label: string; to: TourPath }> = {
  shard: { label: 'Open Story Shards', to: '/shards' },
  concept: { label: 'Open Concepts', to: '/concepts' },
  char: { label: 'Open the Character Center', to: '/characters' },
  outline: { label: 'Start an outline', to: '/outlines/new' },
  desk: { label: 'Open the Writer’s Desk', to: '/desk' },
};

/** A short guided start on the Hub. Put away for good with "Put the tour away". */
export function WelcomeTour({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId);
  const done = TOUR.map((s) => s.done(entries));
  const count = done.filter(Boolean).length;
  const firstOpen = done.indexOf(false);
  const [at, setAt] = useState(firstOpen === -1 ? TOUR.length - 1 : firstOpen);
  // When the step on show gets done, move on to the next one still open.
  const [seen, setSeen] = useState(count);
  if (count !== seen) {
    setSeen(count);
    if (done[at] && firstOpen !== -1) setAt(firstOpen);
  }
  const step = TOUR[at]!;
  const action = ACTIONS[step.key]!;

  const putAway = () => {
    if (ws) setWelcomeDismissed(ws, true);
    onClose();
  };

  return (
    <section
      className="panel flex flex-col gap-3 border-t-4 border-t-accent"
      aria-label="Welcome tour"
      data-sec={step.sec}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="label">Welcome tour</div>
          <h2 className="text-[1.25rem]">
            {count === TOUR.length ? 'You’ve tried every station' : 'Five small steps to start'}
          </h2>
          <p className="text-[0.85rem] text-muted">
            {count} of {TOUR.length} done. Take them in any order, or skip ahead.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={putAway}>
          Put the tour away
        </button>
      </div>

      <ol className="flex gap-1.5" aria-label="Steps">
        {TOUR.map((s, i) => (
          <li key={s.key} className="min-w-0 flex-1" data-sec={s.sec}>
            <button
              type="button"
              className={`flex w-full flex-col items-start gap-1 rounded-md p-1.5 text-left hover:bg-sunken ${i === at ? 'bg-sunken' : ''}`}
              aria-current={i === at ? 'step' : undefined}
              aria-label={`${s.title}${done[i] ? ' (done)' : ''}`}
              onClick={() => setAt(i)}
            >
              <span
                className={`block h-1.5 w-full rounded-full ${done[i] ? 'bg-accent' : 'bg-line'}`}
              />
              <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-accent max-sm:hidden">
                {done[i] ? <Icon name="check" size={12} /> : `${i + 1}.`}
                <span className="truncate">{s.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="flex gap-3 max-sm:flex-col">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon name={step.icon} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="flex items-center gap-2 text-[1.05rem]">
            Step {at + 1}: {step.title}
            {done[at] && (
              <span className="chip">
                <Icon name="check" size={12} /> Done
              </span>
            )}
          </h3>
          <p className="text-[0.9rem] text-muted">{step.body}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={action.to} className="btn btn-primary btn-small">
              {action.label} →
            </Link>
            {step.key === 'desk' && (
              <Link to="/desk" search={{ import: true }} className="btn btn-small">
                <Icon name="upload" size={14} />
                Import a draft instead
              </Link>
            )}
            <span className="ml-auto flex gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={at === 0}
                onClick={() => setAt(at - 1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={at === TOUR.length - 1}
                onClick={() => setAt(at + 1)}
              >
                Next
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
