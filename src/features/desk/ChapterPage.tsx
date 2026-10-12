import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { filterCast } from '../characters/characterModel';
import { beatNote } from '../outlines/outlineModel';
import { structureByKey } from '../outlines/structures';
import {
  addScene,
  chapterBeatKeys,
  childrenOf,
  move,
  SCENE_FIELDS,
  SCENE_TYPES,
  sceneText,
  scenePov,
  words,
} from './deskModel';

/** The Chapter Builder: one chapter's goal, its beats, and its scene cards in order. */
export function ChapterPage({ chapterId }: { chapterId: string }) {
  const chapter = useEntry(chapterId);
  const bookId = chapter.data?.parentId ?? null;
  return (
    <div data-sec="desk" className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      {bookId ? (
        <Link
          to="/desk/$bookId"
          params={{ bookId }}
          className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
        >
          <Icon name="arrowLeft" size={16} />
          Manuscript
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
      {chapter.data === undefined ? (
        chapter.error ? (
          <EmptyState>Couldn’t load this chapter. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : !chapter.data || chapter.data.deletedAt ? (
        <EmptyState>This chapter isn’t here. It may have been deleted.</EmptyState>
      ) : (
        <ChapterBuilder key={chapter.data.id} chapter={chapter.data} />
      )}
    </div>
  );
}

function ChapterBuilder({ chapter }: { chapter: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const book = useEntry(chapter.parentId ?? null);
  const allChapters = useEntries('chapter');
  const allScenes = useEntries('scene');
  const siblings = useMemo(
    () => childrenOf(allChapters.data, chapter.parentId ?? ''),
    [allChapters.data, chapter.parentId],
  );
  const index = siblings.findIndex((c) => c.id === chapter.id);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  const scenes = useMemo(
    () => childrenOf(allScenes.data, chapter.id),
    [allScenes.data, chapter.id],
  );
  const title = useAutosaved(chapter.title, (v) =>
    updateEntry(ws, chapter.id, { title: v.trim() || `Chapter ${index + 1}` }),
  );
  const goal = useAutosaved(sceneText(chapter, 'goal'), (v) =>
    updateEntry(ws, chapter.id, {}, { goal: v.trim() }),
  );
  const structure = structureByKey(
    typeof chapter.fields.structure === 'string' ? chapter.fields.structure : undefined,
  );
  const beats = chapterBeatKeys(chapter).flatMap(
    (k) => structure.beats.find((b) => b.key === k) ?? [],
  );

  const onDelete = () => {
    title.flush();
    goal.flush();
    trashEntry(ws, chapter.id);
    if (chapter.parentId)
      void navigate({ to: '/desk/$bookId', params: { bookId: chapter.parentId } });
    toast('Chapter moved to the trash, with its scenes.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, chapter.id) },
    });
  };

  return (
    <>
      <article className="panel flex flex-col gap-3 border-t-4 border-t-accent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label">
            {index >= 0 ? `Chapter ${index + 1} of ${siblings.length}` : 'Chapter'}
            {book.data ? ` · ${book.data.title}` : ''}
          </span>
          <span className="text-[0.8rem] text-muted">
            {scenes.reduce((s, sc) => s + words(sc), 0).toLocaleString()} words
          </span>
        </div>
        <label>
          <span className="sr-only">Chapter title</span>
          <input
            className="w-full border-0 bg-transparent p-0 font-display text-[1.7rem] font-semibold outline-none max-sm:text-[1.45rem]"
            {...title.props}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Chapter goal</span>
          <textarea
            className="txt field-sizing-content min-h-14"
            placeholder="What this chapter has to do for the story, and the hook it ends on."
            {...goal.props}
          />
        </label>
        {beats.length > 0 && (
          <div data-sec="story" className="flex flex-col gap-1.5">
            <span className="label">Beats in this chapter</span>
            <ul className="flex flex-col gap-1.5">
              {beats.map((b) => {
                const note = book.data ? beatNote(book.data, structure.key, b.key) : '';
                return (
                  <li key={b.key} className="text-[0.88rem]">
                    <span className="chip mr-1.5">{b.name}</span>
                    <span className={note ? '' : 'text-muted'}>{note || b.prompt}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {prev && (
            <Link
              to="/desk/chapters/$chapterId"
              params={{ chapterId: prev.id }}
              className="btn btn-small"
            >
              ← {prev.title}
            </Link>
          )}
          {next && (
            <Link
              to="/desk/chapters/$chapterId"
              params={{ chapterId: next.id }}
              className="btn btn-small"
            >
              {next.title} →
            </Link>
          )}
          <button type="button" className="btn btn-ghost btn-small ml-auto" onClick={onDelete}>
            <Icon name="trash" size={14} />
            Delete chapter
          </button>
        </div>
      </article>

      <section className="flex flex-col gap-2.5" aria-label="Scenes">
        <h2 className="text-[1.05rem]">Scenes</h2>
        {allScenes.data === undefined ? (
          <Loading />
        ) : scenes.length === 0 ? (
          <EmptyState>No scenes yet. Every scene should change something.</EmptyState>
        ) : (
          <ol className="flex flex-col gap-3">
            {scenes.map((s, i) => (
              <SceneCard
                key={s.id}
                scene={s}
                n={i + 1}
                first={i === 0}
                last={i === scenes.length - 1}
                onMove={(dir) => move(ws, scenes, s.id, dir)}
              />
            ))}
          </ol>
        )}
        <button type="button" className="btn self-start" onClick={() => addScene(ws, chapter)}>
          + Add a scene
        </button>
      </section>
    </>
  );
}

function SceneField({ scene, field }: { scene: Entry; field: (typeof SCENE_FIELDS)[number] }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const value = useAutosaved(sceneText(scene, field.key), (v) =>
    updateEntry(ws, scene.id, {}, { [field.key]: v.trim() }),
  );
  return (
    <label
      className={`flex flex-col gap-1 ${'long' in field && field.long ? 'sm:col-span-2' : ''}`}
    >
      <span className="label">{field.label}</span>
      {'long' in field && field.long ? (
        <textarea
          className="txt field-sizing-content min-h-14"
          placeholder={field.placeholder}
          {...value.props}
        />
      ) : (
        <input className="txt" placeholder={field.placeholder} {...value.props} />
      )}
    </label>
  );
}

function SceneCard({
  scene,
  n,
  first,
  last,
  onMove,
}: {
  scene: Entry;
  n: number;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const characters = useEntries('character');
  const cast = useMemo(() => filterCast(characters.data ?? [], ''), [characters.data]);
  const title = useAutosaved(scene.title, (v) =>
    updateEntry(ws, scene.id, { title: v.trim() || 'Untitled scene' }),
  );
  const type = sceneText(scene, 'sceneType') || 'scene';
  const name = scene.title || 'Untitled scene';

  const onDelete = () => {
    title.flush();
    trashEntry(ws, scene.id);
    toast('Scene moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, scene.id) },
    });
  };

  return (
    <li className="panel flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.85rem] text-accent">{n}</span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Scene title</span>
          <input
            className="w-full border-0 bg-transparent p-0 font-display text-[1.1rem] font-semibold outline-none"
            {...title.props}
          />
        </label>
        <span className="text-[0.78rem] text-muted">{words(scene).toLocaleString()} words</span>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={`Move ${name} up`}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={`Move ${name} down`}
          disabled={last}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="label">Type</span>
          <div role="group" aria-label="Scene type" className="flex gap-1.5">
            {SCENE_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className="seg"
                title={t.hint}
                aria-pressed={type === t.key}
                onClick={() => updateEntry(ws, scene.id, {}, { sceneType: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <label data-sec="char" className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="label">Point of view</span>
          <select
            className="txt"
            value={scenePov(scene) ?? ''}
            onChange={(e) => updateEntry(ws, scene.id, {}, { pov: e.target.value })}
          >
            <option value="">No one chosen</option>
            {cast.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || 'Unnamed character'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {SCENE_FIELDS.map((f) => (
          <SceneField key={f.key} scene={scene} field={f} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" className="btn btn-ghost btn-small ml-auto" onClick={onDelete}>
          <Icon name="trash" size={14} />
          Delete scene
        </button>
      </div>
    </li>
  );
}
