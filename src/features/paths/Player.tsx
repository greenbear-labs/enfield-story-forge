import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { savePlay, setEndingsFound, usePlay, usePlays } from '../../lib/entries/plays';
import { gemBalance, gemsForEnding, gemsText } from './rewardsModel';
import { proseToHtml } from '../../lib/entries/prose';
import { useAuthStore } from '../auth/authStore';
import { Icon } from '../../components/ui/Icon';
import {
  choicesOf,
  endingLabel,
  endingOf,
  passageName,
  startIdOf,
  type Choice,
} from './pathsModel';
import {
  beginAt,
  endingTally,
  endingsFoundText,
  findsNewEnding,
  stepBack,
  stepTo,
  unlockKey,
  type Play,
  type Route,
} from './playModel';
import {
  condText,
  linesOf,
  meets,
  stateAlong,
  stateSummary,
  storyVars,
  unmet,
  type StoryState,
  type StoryVar,
} from './stateModel';
import { usePathsTitle } from './usePathsTitle';

/** A passage as the player needs it: its name, choices, lines, and ending. */
export type PlayablePassage = Pick<Entry, 'id' | 'title' | 'fields'>;

/** A story to play: a draft (playtest) or a published copy (a reader). */
export interface PlayableStory {
  /** The playthrough's id in `plays/`. */
  playId: string;
  title: string;
  blurb: string;
  /** The story's own fields: `startId` and `state`. */
  fields: Entry['fields'];
  passages: PlayablePassage[];
}

/**
 * Plays a story one passage at a time. Where the reader is and the endings
 * they've found are saved in their own workspace, so they can stop and pick it
 * up later, even offline. A playtest (`draft`) also links back to the editor.
 */
export function Player({
  story,
  cover,
  draft,
  from,
  onFromHandled,
  renderBody,
  renderArt,
  nav,
}: {
  story: PlayableStory;
  /** The picture behind the title before the first step. */
  cover: ReactNode;
  /** The adventure being playtested, for links back to its map. Null for a reader. */
  draft: { adventureId: string } | null;
  /** Start a run at this passage, then call `onFromHandled`. */
  from: string | null;
  onFromHandled: () => void;
  renderBody: (passage: PlayablePassage) => ReactNode;
  renderArt: (passage: PlayablePassage) => ReactNode;
  /** The way out, top left. */
  nav: (currentId: string | null) => ReactNode;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const { passages } = story;
  const byId = useMemo(() => new Map(passages.map((p) => [p.id, p])), [passages]);
  const live = usePlay(story.playId);
  const play = live.data;
  // A reader's gems (playtests don't earn or spend any).
  const allPlays = usePlays().data;
  const gems = draft || !allPlays ? null : gemBalance(allPlays);
  const endingCount = useMemo(() => passages.filter((p) => endingOf(p)).length, [passages]);
  // The ending just found for the first time, to celebrate it.
  const [fresh, setFresh] = useState<string | null>(null);
  usePathsTitle(`Playing ${story.title || 'Untitled adventure'}`);

  /** Saves the reader's new place, and returns whether they just found a new ending. */
  const save = (route: Route, current: Play, unlock?: { key: string; cost: number }): boolean => {
    const at = byId.get(route.path.at(-1)!);
    const kind = at ? endingOf(at) : null;
    const isNew = !!at && !!kind && findsNewEnding(current, at);
    savePlay(ws, story.playId, {
      ...route,
      endingFound: isNew ? { id: at.id, kind } : undefined,
      unlock,
      story: draft ? undefined : { title: story.title, total: endingCount },
    });
    window.scrollTo({ top: 0 });
    return isNew;
  };
  const go = (route: Route, current: Play, unlock?: { key: string; cost: number }) =>
    setFresh(save(route, current, unlock) ? route.path.at(-1)! : null);
  const begin = (current: Play) => {
    const at = startIdOf(story);
    if (at) go(beginAt(at), current);
  };

  // "Play from here" on a passage starts a run there.
  useEffect(() => {
    if (!play || !from) return;
    if (byId.has(from)) save(beginAt(from), play);
    onFromHandled();
    // Runs once per "Play from here", when the playthrough has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play !== undefined, from]);

  if (live.error)
    return (
      <EmptyState>
        Couldn’t load your place in the story. Check your connection and reload.
      </EmptyState>
    );
  if (!play || from) return <Loading />;

  const tally = endingTally(passages, play);
  const currentId = play.path.at(-1);
  const current = currentId ? byId.get(currentId) : undefined;
  const startId = startIdOf(story);
  const vars = storyVars(story);
  const state = stateAlong(
    play.path,
    play.via,
    byId,
    vars,
    (p, choiceId) => choicesOf(p).find((c) => c.id === choiceId)?.effects ?? [],
  );

  const forget = () => {
    const before = play.endings;
    setEndingsFound(ws, story.playId, {});
    toast('Endings found are forgotten.', {
      action: { label: 'Undo', onClick: () => setEndingsFound(ws, story.playId, before) },
    });
  };

  return (
    <>
      <nav
        aria-label={draft ? 'Playtest' : 'Story'}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[0.85rem]"
      >
        {nav(current?.id ?? null)}
        <span className="flex flex-wrap items-center gap-2">
          {draft && <span className="chip">Playtest</span>}
          <span className="text-muted">{endingsFoundText(tally)}</span>
          {play.path.length > 0 && startId && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => begin(play)}>
              Start over
            </button>
          )}
        </span>
      </nav>

      {current && vars.length > 0 && <StateStrip vars={vars} state={state} />}

      {play.path.length === 0 || !current ? (
        <Cover
          story={story}
          cover={cover}
          tally={tally}
          lost={play.path.length > 0}
          draft={!!draft}
          onBegin={startId && byId.has(startId) ? () => begin(play) : null}
        />
      ) : (
        <PassageView
          key={current.id}
          draft={draft}
          passage={current}
          body={renderBody(current)}
          art={renderArt(current)}
          byId={byId}
          route={play.path}
          vars={vars}
          state={state}
          fresh={fresh === current.id}
          unlocked={play.unlocked}
          gems={gems}
          tally={tally}
          onChoose={(to, choice) => {
            const key = unlockKey(current.id, choice.id);
            const unlock =
              gems !== null && choice.cost > 0 && !(key in play.unlocked)
                ? { key, cost: choice.cost }
                : undefined;
            if (unlock && gems! < unlock.cost) return;
            go(stepTo(play, to, choice.id), play, unlock);
          }}
          onBack={play.path.length > 1 ? () => go(stepBack(play), play) : null}
          onAgain={() => begin(play)}
          onForget={Object.keys(play.endings).length ? forget : null}
        />
      )}
    </>
  );
}

/** A passage's prose, as the reader sees it. */
export function Prose({ doc, error }: { doc: unknown | undefined; error?: boolean }) {
  if (doc === undefined)
    return error ? (
      <EmptyState>Couldn’t load this passage. Check your connection and reload.</EmptyState>
    ) : (
      <Loading />
    );
  const html = doc ? proseToHtml(doc) : '';
  return html ? (
    <div className="sp-prose rich-page" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <p className="text-muted italic">This passage has no words yet.</p>
  );
}

/** Before the first step: the adventure's cover, blurb, and a way in. */
function Cover({
  story,
  cover,
  tally,
  lost,
  draft,
  onBegin,
}: {
  story: PlayableStory;
  cover: ReactNode;
  tally: ReturnType<typeof endingTally>;
  lost: boolean;
  draft: boolean;
  onBegin: (() => void) | null;
}) {
  return (
    <section className="paths-banner flex min-h-[420px] items-end p-8 max-sm:min-h-[360px] max-sm:p-5">
      {cover}
      <div className="paths-banner-body flex max-w-[520px] flex-col gap-3">
        <h1 className="paths-glow font-display text-[2.6rem] leading-tight max-sm:text-[2rem]">
          {story.title || 'Untitled adventure'}
        </h1>
        {story.blurb && <p className="font-display text-[1.15rem] italic">{story.blurb}</p>}
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
            {draft
              ? 'This story has no first passage yet. Write one on the story map.'
              : 'This story has no first passage yet.'}
          </p>
        )}
      </div>
    </section>
  );
}

function PassageView({
  draft,
  passage,
  body,
  art,
  byId,
  route,
  vars,
  state,
  fresh,
  unlocked,
  gems,
  tally,
  onChoose,
  onBack,
  onAgain,
  onForget,
}: {
  draft: { adventureId: string } | null;
  passage: PlayablePassage;
  body: ReactNode;
  art: ReactNode;
  byId: Map<string, PlayablePassage>;
  route: string[];
  vars: StoryVar[];
  state: StoryState;
  fresh: boolean;
  /** Choices this reader has unlocked with gems. */
  unlocked: Play['unlocked'];
  /** The reader's gems, or null in a playtest. */
  gems: number | null;
  tally: ReturnType<typeof endingTally>;
  onChoose: (to: string, choice: Choice) => void;
  onBack: (() => void) | null;
  onAgain: () => void;
  onForget: (() => void) | null;
}) {
  const ending = endingOf(passage);
  const choices = choicesOf(passage);
  // Lines that only show sometimes: the ones whose need the reader meets.
  const lines = linesOf(passage).filter(
    (l) => l.text.trim() && (!l.when || meets(state, l.when, vars)),
  );

  return (
    <article className="sp-page mx-auto flex w-full max-w-[680px] flex-col gap-5">
      {art}
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

      {body}
      {lines.length > 0 && (
        <div className="sp-prose rich-page">
          {lines.map((l) => (
            <p key={l.id}>{l.text}</p>
          ))}
        </div>
      )}

      {ending && (
        <section className="sp-ending" data-ending={ending} aria-label="The end">
          {fresh && (
            <p className="sp-ending-new">
              New ending found
              {gems !== null && ` · +${gemsText(gemsForEnding(ending))}`}
            </p>
          )}
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
            const needs = unmet(state, c.requires, vars);
            // A reader pays a choice's gems once; a playtest shows the cost but it's free.
            const toUnlock = c.cost > 0 && !(unlockKey(passage.id, c.id) in unlocked) ? c.cost : 0;
            const short = gems !== null && toUnlock > gems;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="sp-choice"
                  disabled={!to || needs.length > 0 || short}
                  onClick={() => to && onChoose(to.id, c)}
                >
                  {needs.length > 0 ? (
                    <Icon name="lock" size={16} className="sp-choice-lock" />
                  ) : (
                    toUnlock > 0 && <Icon name="gem" size={16} className="sp-choice-lock" />
                  )}
                  {label}
                  {needs.length > 0 ? (
                    <span className="block font-[family-name:var(--font-ui)] text-[0.8rem] text-muted">
                      Needs: {needs.map((n) => condText(n, vars)).join(', ')}
                    </span>
                  ) : !to ? (
                    <span className="text-[0.8rem] text-muted"> · not written yet</span>
                  ) : (
                    toUnlock > 0 && (
                      <span className="sp-choice-cost">
                        {gems === null
                          ? `Costs ${gemsText(toUnlock)} to unlock · free in playtest`
                          : short
                            ? `Unlock for ${gemsText(toUnlock)} · you have ${gemsText(gems)}`
                            : `Unlock for ${gemsText(toUnlock)}`}
                      </span>
                    )
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !ending && (
          <p className="rounded-md border border-dashed border-line p-4 text-[0.9rem] text-muted">
            {draft ? (
              <>
                The path stops here: this passage has no choices and isn’t an ending. Readers would
                be stuck.{' '}
                <Link
                  to="/paths/$adventureId"
                  params={{ adventureId: draft.adventureId }}
                  search={{ passage: passage.id }}
                  className="text-accent underline"
                >
                  Add a choice
                </Link>
              </>
            ) : (
              'The path stops here. Go back a step, or start over.'
            )}
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
        {draft && (
          <Link
            to="/paths/$adventureId"
            params={{ adventureId: draft.adventureId }}
            search={{ passage: passage.id }}
            className="text-muted hover:text-accent"
          >
            Edit this passage
          </Link>
        )}
      </footer>
    </article>
  );
}

/** The way the reader came, as a short trail of passage names. */
function Route({ route, byId }: { route: string[]; byId: Map<string, PlayablePassage> }) {
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

/** What the reader carries and what's true right now. */
function StateStrip({ vars, state }: { vars: StoryVar[]; state: StoryState }) {
  const { items, flags, counters } = stateSummary(state, vars);
  const hasItems = vars.some((v) => v.kind === 'item');
  const hasFlags = vars.some((v) => v.kind === 'flag');
  return (
    <aside
      aria-label="Story state"
      className="mx-auto flex w-full max-w-[680px] flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-line bg-sunken px-3 py-2 text-[0.82rem]"
    >
      {hasItems && (
        <span>
          <span className="text-muted">Carrying: </span>
          {items.length ? items.join(', ') : 'nothing'}
        </span>
      )}
      {hasFlags && (
        <span>
          <span className="text-muted">True: </span>
          {flags.length ? flags.join(', ') : 'nothing yet'}
        </span>
      )}
      {counters.map((c) => (
        <span key={c.name}>
          <span className="text-muted">{c.name}: </span>
          {c.value}
        </span>
      ))}
    </aside>
  );
}
