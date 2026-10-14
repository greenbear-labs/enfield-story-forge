import type { Entry } from '../../data/types';
import { storyHealth, type IssueKind } from './healthModel';

const KIND_LABEL: Record<IssueKind, string> = {
  'no-start': 'No start',
  'no-endings': 'No endings',
  unreachable: 'Unreachable',
  'dead-end': 'Dead end',
  undecided: 'Not decided',
  broken: 'Broken choice',
  'never-open': 'Never opens',
};

/**
 * Story health: what to check before readers play, each with a way to the
 * passage, and a few numbers about the story's routes.
 */
export function StoryHealth({
  adventure,
  passages,
  onOpen,
}: {
  adventure: Entry;
  passages: Entry[];
  onOpen: (passageId: string) => void;
}) {
  const h = storyHealth(adventure, passages);
  const count = h.issues.length;
  return (
    <details className="panel sp-details" open={count > 0 || undefined}>
      <summary className="cursor-pointer font-display text-[1.15rem]">
        Story health:{' '}
        {count === 0 ? 'all clear' : count === 1 ? '1 thing to check' : `${count} things to check`}
      </summary>
      <div className="flex flex-col gap-3 pt-3">
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.88rem] text-muted">
          <span>
            {h.reachable} of {h.passages} {h.passages === 1 ? 'passage' : 'passages'} reachable
          </span>
          {h.endings.map((e) => (
            <span key={e.type} className="sp-ending-chip" data-ending={e.type}>
              {e.label}: {e.reachable} of {e.count} reachable
            </span>
          ))}
          {h.quickest !== null && (
            <span>
              Quickest ending: {h.quickest} {h.quickest === 1 ? 'passage' : 'passages'}
              {h.farthest !== h.quickest && ` · farthest: ${h.farthest} passages`}
            </span>
          )}
        </p>
        {count === 0 ? (
          <p className="text-[0.9rem]">
            Every passage can be reached, every choice leads somewhere, and every path ends.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {h.issues.map((issue, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[0.9rem]">
                <span className="chip">{KIND_LABEL[issue.kind]}</span>
                <span className="min-w-0 flex-1 basis-[240px]">{issue.text}</span>
                {issue.passageId && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => onOpen(issue.passageId!)}
                  >
                    Go to passage
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
