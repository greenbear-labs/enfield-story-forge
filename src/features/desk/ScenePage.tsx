import { Link } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { saveBody, updateEntry } from '../../lib/entries/entries';
import { useBody, useEntries, useEntry, useLinks } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { recordWords, useDailyGoal, useWritingDays } from '../../lib/entries/writing';
import { useAuthStore } from '../auth/authStore';
import { linkables } from '../world/worldModel';
import { manuscriptScenes, sceneText, syncMentions, words } from './deskModel';
import type { ProseHandle, ProseSave } from './ProseEditor';
import { SceneSetup } from './SceneSetup';
import { SnapshotsPanel } from './SnapshotsPanel';
import { DEFAULT_DAILY_GOAL, dayKey } from './writingModel';

// The editor is the biggest piece of the app, so it loads only when you write.
const ProseEditor = lazy(() => import('./ProseEditor'));

/** The Scene Desk: one scene's prose, with its setup on the side and a focus mode. */
export function ScenePage({ sceneId }: { sceneId: string }) {
  const scene = useEntry(sceneId);
  const chapterId = scene.data?.parentId ?? null;
  return (
    <div data-sec="desk" className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      {chapterId ? (
        <Link
          to="/desk/chapters/$chapterId"
          params={{ chapterId }}
          className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
        >
          <Icon name="arrowLeft" size={16} />
          Chapter
        </Link>
      ) : (
        <Link
          to="/desk"
          className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
        >
          <Icon name="arrowLeft" size={16} />
          Writer’s Desk
        </Link>
      )}
      {scene.data === undefined ? (
        scene.error ? (
          <EmptyState>Couldn’t load this scene. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : !scene.data || scene.data.deletedAt ? (
        <EmptyState>This scene isn’t here. It may have been deleted.</EmptyState>
      ) : (
        <SceneDesk key={scene.data.id} scene={scene.data} />
      )}
    </div>
  );
}

function SceneDesk({ scene }: { scene: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const body = useBody(scene.id);
  const chapter = useEntry(scene.parentId ?? null);
  const bookId = chapter.data?.parentId ?? null;
  const book = useEntry(bookId);
  const allChapters = useEntries('chapter');
  const allScenes = useEntries('scene');
  const order = useMemo(
    () => (bookId ? manuscriptScenes(allChapters.data, allScenes.data, bookId) : []),
    [allChapters.data, allScenes.data, bookId],
  );
  const index = order.findIndex((r) => r.scene.id === scene.id);
  const here = order[index];
  const prev = order[index - 1]?.scene;
  const next = order[index + 1]?.scene;
  const sceneNumber = here
    ? order.filter((r) => r.chapter.id === here.chapter.id).indexOf(here) + 1
    : 0;

  const [count, setCount] = useState(words(scene));
  const [focus, setFocus] = useState(false);
  const prose = useRef<ProseHandle>(null);
  const title = useAutosaved(scene.title, (v) =>
    updateEntry(ws, scene.id, { title: v.trim() || 'Untitled scene' }),
  );
  const characters = useEntries('character');
  const worldPages = useEntries('page');
  const indexes = useEntries('index');
  // Your cast, and the World Creator's pages: places, peoples, items, and the rest.
  const mentionables = useMemo(
    () =>
      linkables(
        [...(characters.data ?? []), ...(worldPages.data ?? []), ...(indexes.data ?? [])],
        scene.id,
      ),
    [characters.data, worldPages.data, indexes.data, scene.id],
  );
  // Who the scene mentions now, so a save can drop the links it no longer needs.
  const mentionLinks = useLinks({ kind: 'mention', fromId: scene.id });
  const mentioned = useRef<string[]>([]);
  useEffect(() => {
    mentioned.current = (mentionLinks.data ?? []).map((l) => l.toId);
  }, [mentionLinks.data]);
  // The writing log counts what each save changed, from the count the editor opened with.
  const logged = useRef<number | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const bookRef = useRef(bookId);
  useEffect(() => {
    bookRef.current = bookId;
  }, [bookId]);
  const onWords = useCallback((n: number) => {
    setCount(n);
    if (logged.current === null) {
      logged.current = n;
      setOpened(n);
      setSaved(n);
    }
  }, []);
  const onSave = useCallback(
    ({ doc, words, mentions }: ProseSave) => {
      saveBody(ws, scene.id, doc);
      updateEntry(ws, scene.id, { wordCount: words });
      syncMentions(ws, scene.id, mentioned.current, mentions);
      mentioned.current = mentions;
      if (logged.current !== null) {
        recordWords(ws, dayKey(), bookRef.current, words - logged.current);
        logged.current = words;
        setSaved(words);
      }
    },
    [ws, scene.id],
  );
  const days = useWritingDays();
  const goal = useDailyGoal();
  const dailyGoal = goal.data === null ? DEFAULT_DAILY_GOAL : (goal.data ?? 0);
  const session = opened === null ? 0 : count - opened;
  // Today's log lags the editor by a save, so add what hasn't been saved yet.
  const today = (days.data?.get(dayKey()) ?? 0) + (saved === null ? 0 : count - saved);

  const leaveFocus = useCallback(() => {
    setFocus(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);
  const enterFocus = () => {
    setFocus(true);
    void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leaveFocus();
    // Leaving full screen (the browser's own Esc) leaves focus mode too.
    const onFull = () => !document.fullscreenElement && setFocus(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFull);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFull);
    };
  }, [focus, leaveFocus]);
  useEffect(() => leaveFocus, [leaveFocus]);

  const wordLabel = `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'}`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[900px]:grid-cols-1">
      <article
        aria-label="Scene"
        className={
          focus
            ? 'fixed inset-0 z-50 overflow-y-auto bg-bg px-4 pt-4 pb-24'
            : 'panel flex flex-col gap-3 border-t-4 border-t-accent'
        }
      >
        <div className={focus ? 'mx-auto flex max-w-[720px] flex-col gap-3' : 'contents'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label">
              {here ? `Chapter ${here.chapterNumber} · Scene ${sceneNumber}` : 'Scene'}
              {book.data ? ` · ${book.data.title}` : ''}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[0.8rem] text-muted" aria-live="polite">
                {wordLabel}
              </span>
              {days.data && (
                <span className="text-[0.8rem] text-muted">
                  {session !== 0 &&
                    `${session > 0 ? '+' : ''}${session.toLocaleString()} this session · `}
                  Today {today.toLocaleString()}
                  {dailyGoal > 0 && ` of ${dailyGoal.toLocaleString()}`}
                </span>
              )}
              {focus ? (
                <button type="button" className="btn btn-small" onClick={leaveFocus}>
                  Leave focus mode
                </button>
              ) : (
                <button type="button" className="btn btn-small" onClick={enterFocus}>
                  Focus mode
                </button>
              )}
            </span>
          </div>
          <label>
            <span className="sr-only">Scene title</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-display text-[1.5rem] font-semibold outline-none"
              {...title.props}
            />
          </label>
          {!focus && sceneText(scene, 'summary') && (
            <p className="text-[0.9rem] text-muted min-[901px]:hidden">
              {sceneText(scene, 'summary')}
            </p>
          )}
          {body.data === undefined ? (
            body.error ? (
              <EmptyState>
                Couldn’t load this scene’s writing. Check your connection and reload.
              </EmptyState>
            ) : (
              <Loading />
            )
          ) : (
            <Suspense fallback={<Loading />}>
              <ProseEditor
                initial={body.data?.doc ?? null}
                onSave={onSave}
                onWords={onWords}
                label={`${scene.title || 'Untitled scene'}: the prose`}
                mentionables={mentionables}
                ref={prose}
              />
            </Suspense>
          )}
          {!focus && (prev || next) && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {prev && (
                <Link
                  to="/desk/scenes/$sceneId"
                  params={{ sceneId: prev.id }}
                  className="btn btn-small"
                >
                  ← {prev.title || 'Untitled scene'}
                </Link>
              )}
              {next && (
                <Link
                  to="/desk/scenes/$sceneId"
                  params={{ sceneId: next.id }}
                  className="btn btn-small ml-auto"
                >
                  {next.title || 'Untitled scene'} →
                </Link>
              )}
            </div>
          )}
        </div>
      </article>
      {!focus && (
        <aside aria-label="Scene setup" className="panel flex flex-col gap-3">
          <h2 className="text-[1.02rem]">Setup</h2>
          {chapter.data && sceneText(chapter.data, 'goal') && (
            <p className="text-[0.85rem]">
              <span className="label block">Chapter goal</span>
              {sceneText(chapter.data, 'goal')}
            </p>
          )}
          <SceneSetup scene={scene} narrow />
          <SnapshotsPanel sceneId={scene.id} editor={prose} />
        </aside>
      )}
    </div>
  );
}
