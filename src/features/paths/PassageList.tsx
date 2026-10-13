import type { Entry } from '../../data/types';
import { Thumb } from '../images/EntryImg';
import { choicesOf, endingLabel, endingOf, passageName, storyOrder } from './pathsModel';

/** The story as a list, in reading order from the start. For phones, or anyone who prefers it. */
export function PassageList({
  passages,
  startId,
  selectedId,
  onSelect,
}: {
  passages: Entry[];
  startId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(passages.map((p) => [p.id, p]));
  return (
    <ol className="panel flex flex-col divide-y divide-line !p-0" aria-label="Passages">
      {storyOrder(passages, startId).map(({ passage, reachable }, i) => {
        const ending = endingOf(passage);
        const choices = choicesOf(passage);
        return (
          <li key={passage.id}>
            <button
              type="button"
              aria-current={passage.id === selectedId || undefined}
              className="flex w-full items-start gap-3 border-0 bg-transparent px-3.5 py-2.5 text-left hover:bg-sunken aria-[current]:bg-accent-soft"
              onClick={() => onSelect(passage.id)}
              data-ending={ending ?? undefined}
            >
              <span className="w-6 flex-none pt-0.5 font-mono text-[0.78rem] text-muted">
                {i + 1}
              </span>
              <Thumb entry={passage} size={44} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  <b className="font-display text-[1.05rem]">{passageName(passage)}</b>
                  {passage.id === startId && <span className="chip">Start</span>}
                  {ending && (
                    <span className="sp-ending-chip" data-ending={ending}>
                      {endingLabel(ending)}
                    </span>
                  )}
                </span>
                {choices.length > 0 && (
                  <span className="truncate text-[0.82rem] text-muted">
                    {choices
                      .map((c) => {
                        const to = c.to ? byId.get(c.to) : undefined;
                        return `${c.label.trim() || '…'} → ${to ? passageName(to) : '?'}`;
                      })
                      .join(' · ')}
                  </span>
                )}
                {!reachable && (
                  <span className="text-[0.78rem] text-muted italic">No choice leads here yet</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
