import { useState, type FormEvent } from 'react';
import { setDailyGoal, useDailyGoal, useWritingDays } from '../../lib/entries/writing';
import { useAuthStore } from '../auth/authStore';
import {
  DEFAULT_DAILY_GOAL,
  dayKey,
  lastDays,
  metGoal,
  parseGoal,
  percent,
  plural,
  streak,
} from './writingModel';

const shortDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/** Today's words against the daily goal, the streak, and the last two weeks. */
export function WritingHabit() {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const days = useWritingDays();
  const goalLive = useDailyGoal();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (days.error || goalLive.error) {
    return <p className="text-[0.88rem] text-muted">Couldn’t load your writing log.</p>;
  }
  if (!days.data || goalLive.data === undefined) {
    return <p className="text-[0.88rem] text-muted">Loading your writing log…</p>;
  }
  const goal = goalLive.data ?? DEFAULT_DAILY_GOAL;
  const today = days.data.get(dayKey()) ?? 0;
  const run = streak(days.data, goal);
  const recent = lastDays(days.data, 14);
  const top = Math.max(goal, ...recent.map((d) => d.words), 1);

  const save = (e: FormEvent) => {
    e.preventDefault();
    setDailyGoal(ws, parseGoal(draft));
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p>
          <span className="font-display text-[1.6rem] font-semibold">
            {Math.max(today, 0).toLocaleString()}
          </span>{' '}
          <span className="text-muted">
            {goal > 0 ? `of ${plural(goal, 'word')} today` : 'words today'}
          </span>
        </p>
        <p className="text-[0.88rem] font-semibold text-accent">
          {run.current > 0
            ? `${plural(run.current, 'day')} in a row${run.today ? '' : ', write today to keep it'}`
            : 'Write today to start a streak'}
          {run.best > run.current && (
            <span className="font-normal text-muted"> · best {plural(run.best, 'day')}</span>
          )}
        </p>
      </div>
      {goal > 0 && (
        <div
          role="progressbar"
          aria-label="Today’s goal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent(today, goal)}
          className="h-2 overflow-hidden rounded-full bg-sunken"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${percent(today, goal)}%` }}
          />
        </div>
      )}
      <figure className="flex flex-col gap-1">
        <ol className="flex h-14 items-end gap-1" aria-label="The last two weeks">
          {recent.map((d) => {
            const met = metGoal(d.words, goal);
            return (
              <li
                key={d.date}
                className="flex h-full min-w-0 flex-1 items-end"
                title={`${shortDate(d.date)}: ${plural(d.words, 'word')}`}
              >
                <span className="sr-only">
                  {shortDate(d.date)}: {plural(d.words, 'word')}
                  {met ? ', goal met' : ''}
                </span>
                <span
                  aria-hidden
                  className={`w-full rounded-sm ${met ? 'bg-accent' : d.words > 0 ? 'bg-accent-soft' : 'bg-sunken'}`}
                  style={{ height: `${Math.max(6, percent(Math.max(d.words, 0), top))}%` }}
                />
              </li>
            );
          })}
        </ol>
        <figcaption className="flex justify-between text-[0.75rem] text-muted">
          <span>Two weeks ago</span>
          <span>Today</span>
        </figcaption>
      </figure>
      {editing ? (
        <form className="flex flex-wrap items-center gap-2" onSubmit={save}>
          <label className="flex items-center gap-2 text-[0.88rem]">
            Daily goal
            <input
              className="txt w-28"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="0 for none"
              autoFocus
            />
            words
          </label>
          <button type="submit" className="btn btn-primary btn-small">
            Save
          </button>
          <button type="button" className="btn btn-small" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-[0.85rem] text-muted">
          {goal > 0
            ? `Daily goal: ${plural(goal, 'word')}.`
            : 'No daily goal. Any day you write counts toward your streak.'}
          <button
            type="button"
            className="font-semibold text-accent"
            onClick={() => {
              setDraft(goal > 0 ? String(goal) : '');
              setEditing(true);
            }}
          >
            Change
          </button>
        </p>
      )}
      <p className="text-[0.78rem] text-muted">
        Counts the words you add to scenes on the Writer’s Desk, minus the ones you cut.
      </p>
    </div>
  );
}
