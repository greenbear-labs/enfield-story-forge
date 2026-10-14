import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { useBody, useEntries, useEntry } from '../../lib/entries/hooks';
import { coverOf } from '../../lib/entries/images';
import { savePlay, setEndingsFound, usePlay } from '../../lib/entries/plays';
import { proseToHtml } from '../../lib/entries/prose';
import { useAuthStore } from '../auth/authStore';
import { EntryImg } from '../images/EntryImg';
import { EntryGate } from '../world/WorldFrame';
import {
  adventureBlurb,
  choicesOf,
  endingLabel,
  endingOf,
  passageName,
  startIdOf,
} from './pathsModel';
import {
  endingTally,
  endingsFoundText,
  findsNewEnding,
  stepBack,
  stepTo,
  type Play,
} from './playModel';
import { usePathsTitle } from './usePathsTitle';

/**
 * Playtest: the author plays their own draft the way a reader will, one
 * passage at a time. Where they are and the endings they've found are saved
 * in their workspace, so they can stop and pick it up later, even offline.
 */
export function PlayPage({ adventureId, from }: { adventureId: string; from?: string }) {
  const adventure = useEntry(adventureId);
  return (
    <EntryGate live={adventure} noun="adventure">
      {(a) => <Player key={a.id} adventure={a} from={from ?? null} />}
    </EntryGate>
  );
}

function Player({ adventure, from }: { adventure: Entry; from: string | null }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const allPassages = useEntries('passage');
  const passages = useMemo(
    () => allPassages.data?.filter((p) => p.parentId === adventure.id),
    [allPassages.data, adventure.id],
  );
  const byId = useMemo(() => new Map((passages ?? []).map((p) => [p.id, p])), [passages]);
  const live = usePlay(adventure.id);
  const play = live.data;
  // The ending just found for the first time, to celebrate it.
  const [fresh, setFresh] = useState<string | null>(null);
  usePathsTitle(`Playing ${adventure.title || 'Untitled adventure'}`);

  /** Saves the reader's new place, and returns whether they just found a new ending. */
  const save = (path: string[], current: Play): boolean => {
    const at = byId.get(path.at(-1)!);
    const isNew = !!at && findsNewEnding(current, at);
    savePlay(ws, adventure.id, { path, endingFound: isNew ? at.id : undefined });
    window.scrollTo({ top: 0 });
    return isNew;
  };
  const go = (path: string[], current: Play) => setFresh(save(path, current) ? path.at(-1)! : null);
  const begin = (current: Play) => {
    const at = startIdOf(adventure);
    if (at) go([at], current);
  };

  // "Play from here" on a passage starts a run there, then tidies the address.
  const ready = play !== undefined && passages !== undefined;
  useEffect(() => {
    if (!ready || !from) return;
    if (byId.has(from)) save([from], play);
    void navigate({
      to: '/paths/$adventureId/play',
      params: { adventureId: adventure.id },
      search: {},
      replace: true,
    });
    // Runs once per "Play from here", when the playthrough and passages have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, from]);

  if (live.error || allPassages.error)
    return <EmptyState>Couldn’t load the story. Check your connection and reload.</EmptyState>;
  if (!play || !passages || from) return <Loading />;

  const tally = endingTally(passages, play);
  const currentId = play.path.at(-1);
  const current = currentId ? byId.get(currentId) : undefined;
  const startId = startIdOf(adventure);

  const forget = () => {
    const before = play.endings;
    setEndingsFound(ws, adventure.id, {});
    toast('Endings found are forgotten.', {
      action: { label: 'Undo', onClick: () => setEndingsFound(ws, adventure.id, before) },
    });
  };

  return (
    <>
      <nav
        aria-label="Playtest"
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[0.85rem]"
      >
        <Link
          to="/paths/$adventureId"
          params={{ adventureId: adventure.id }}
          search={current ? { passage: current.id } : {}}
          className="text-muted hover:text-accent"
        >
          ← Back to the story map
        </Link>
        <span className="flex flex-wrap items-center gap-2">
          <span className="chip">Playtest</span>
          <span className="text-muted">{endingsFoundText(tally)}</span>
          {play.path.length > 0 && startId && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => begin(play)}>
              Start over
            </button>
          )}
        </span>
      </nav>

      {play.path.length === 0 || !current ? (
        <Cover
          adventure={adventure}
          tally={tally}
          lost={play.path.length > 0}
          onBegin={startId && byId.has(startId) ? () => begin(play) : null}
        />
      ) : (
        <PassageView
          key={current.id}
          adventure={adventure}
          passage={current}
          byId={byId}
          route={play.path}
          fresh={fresh === current.id}
          tally={tally}
          onChoose={(to) => go(stepTo(play.path, to), play)}
          onBack={play.path.length > 1 ? () => go(stepBack(play.path), play) : null}
          onAgain={() => begin(play)}
          onForget={Object.keys(play.endings).length ? forget : null}
        />
      )}
    </>
  );
}

/** Before the first step: the adventure's cover, blurb, and a way in. */
function Cover({
  adventure,
  tally,
  lost,
  onBegin,
}: {
  adventure: Entry;
  tally: ReturnType<typeof endingTally>;
  lost: boolean;
  onBegin: (() => void) | null;
}) {
  const cover = coverOf(adventure);
  return (
    <section className="paths-banner flex min-h-[420px] items-end p-8 max-sm:min-h-[360px] max-sm:p-5">
      {cover ? (
        <EntryImg image={cover} alt="" />
      ) : (
        <img src="/paths-art/lantern-path.webp" alt="" />
      )}
      <div className="paths-banner-body flex max-w-[520px] flex-col gap-3">
        <h1 className="paths-glow font-display text-[2.6rem] leading-tight max-sm:text-[2rem]">
          {adventure.title || 'Untitled adventure'}
        </h1>
        {adventureBlurb(adventure) && (
          <p className="font-display text-[1.15rem] italic">{adventureBlurb(adventure)}</p>
        )}
        {tally.total > 0 && <p className="text-[0.9rem] text-muted">{endingsFoundText(tally)}</p>}
        {lost && (
          <p className="text-[0.9rem] text-muted">
            The passage you were on is gone, so this run starts again.
          </p>
        )}
        {onBegin ? (
          <button type="button" className="btn btn-primary self-start" onClick={onBegin}>
            Begin
          </button>
        ) : (
          <p className="text-[0.9rem] text-muted">
            This story has no first passage yet. Write one on the story map.
          </p>
        )}
      </div>
    </section>
  );
}

function PassageView({
  adventure,
  passage,
  byId,
  route,
  fresh,
  tally,
  onChoose,
  onBack,
  onAgain,
  onForget,
}: {
  adventure: Entry;
  passage: Entry;
  byId: Map<string, Entry>;
  route: string[];
  fresh: boolean;
  tally: ReturnType<typeof endingTally>;
  onChoose: (to: string) => void;
  onBack: (() => void) | null;
  onAgain: () => void;
  onForget: (() => void) | null;
}) {
  const body = useBody(passage.id);
  const cover = coverOf(passage);
  const ending = endingOf(passage);
  const choices = choicesOf(passage);
  const html = body.data ? proseToHtml(body.data.doc) : '';

  return (
    <article className="sp-page mx-auto flex w-full max-w-[680px] flex-col gap-5">
      {cover && <EntryImg image={cover} alt="" className="sp-page-art" />}
      <header className="flex flex-col gap-1">
        {ending && (
          <span className="sp-ending-chip self-start" data-ending={ending}>
            {endingLabel(ending)}
          </span>
        )}
        <h1 className="font-display text-[2rem] leading-tight max-sm:text-[1.6rem]">
          {passageName(passage)}
        </h1>
      </header>

      {body.data === undefined ? (
        body.error ? (
          <EmptyState>Couldn’t load this passage. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : html ? (
        <div className="sp-prose rich-page" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-muted italic">This passage has no words yet.</p>
      )}

      {ending && (
        <section className="sp-ending" data-ending={ending} aria-label="The end">
          {fresh && <p className="sp-ending-new">New ending found</p>}
          <p className="font-display text-[1.8rem] leading-tight">The end</p>
          <p className="text-[0.9rem] text-muted">
            {endingLabel(ending)} · {endingsFoundText(tally)}
          </p>
          {tally.byType.length > 1 && (
            <ul className="flex flex-wrap justify-center gap-1.5">
              {tally.byType.map((t) => (
                <li key={t.type} className="sp-ending-chip" data-ending={t.type}>
                  {t.label}: {t.found} of {t.total}
                </li>
              ))}
            </ul>
          )}
          <Route route={route} byId={byId} />
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={onAgain}>
              Play again
            </button>
            {onForget && (
              <button type="button" className="btn btn-ghost btn-small" onClick={onForget}>
                Forget endings found
              </button>
            )}
          </div>
        </section>
      )}

      {choices.length > 0 ? (
        <ul className="flex flex-col gap-2.5" aria-label="Choices">
          {choices.map((c) => {
            const to = c.to ? byId.get(c.to) : undefined;
            const label = c.label.trim() || (to ? passageName(to) : 'Go on');
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="sp-choice"
                  disabled={!to}
                  onClick={() => to && onChoose(to.id)}
                >
                  {label}
                  {!to && <span className="text-[0.8rem] text-muted"> · not written yet</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !ending && (
          <p className="rounded-md border border-dashed border-line p-4 text-[0.9rem] text-muted">
            The path stops here: this passage has no choices and isn’t an ending. Readers would be
            stuck.{' '}
            <Link
              to="/paths/$adventureId"
              params={{ adventureId: adventure.id }}
              search={{ passage: passage.id }}
              className="text-accent underline"
            >
              Add a choice
            </Link>
          </p>
        )
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[0.85rem]">
        {onBack ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
            ← Back a step
          </button>
        ) : (
          <span />
        )}
        <Link
          to="/paths/$adventureId"
          params={{ adventureId: adventure.id }}
          search={{ passage: passage.id }}
          className="text-muted hover:text-accent"
        >
          Edit this passage
        </Link>
      </footer>
    </article>
  );
}

/** The way the reader came, as a short trail of passage names. */
function Route({ route, byId }: { route: string[]; byId: Map<string, Entry> }) {
  const names = route.map((id) => {
    const p = byId.get(id);
    return p ? passageName(p) : 'A lost passage';
  });
  return (
    <details className="w-full text-[0.85rem]">
      <summary className="cursor-pointer text-muted">
        Your route: {route.length} {route.length === 1 ? 'passage' : 'passages'}
      </summary>
      <ol className="sp-route mt-2">
        {names.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ol>
    </details>
  );
}
