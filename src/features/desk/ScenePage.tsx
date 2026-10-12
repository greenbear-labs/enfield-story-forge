import { Link } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { saveBody, updateEntry } from '../../lib/entries/entries';
import { useBody, useEntries, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { manuscriptScenes, sceneText, words } from './deskModel';
import type { ProseSave } from './ProseEditor';
import { SceneSetup } from './SceneSetup';

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
  const title = useAutosaved(scene.title, (v) =>
    updateEntry(ws, scene.id, { title: v.trim() || 'Untitled scene' }),
  );
  const onSave = useCallback(
    ({ doc, words }: ProseSave) => {
      saveBody(ws, scene.id, doc);
      updateEntry(ws, scene.id, { wordCount: words });
    },
    [ws, scene.id],
  );

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
            <span className="flex items-center gap-2">
              <span className="text-[0.8rem] text-muted" aria-live="polite">
                {wordLabel}
              </span>
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
                onWords={setCount}
                label={`${scene.title || 'Untitled scene'}: the prose`}
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
        </aside>
      )}
    </div>
  );
}
