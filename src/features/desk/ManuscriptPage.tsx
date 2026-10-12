import { Link } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { structureByKey } from '../outlines/structures';
import { addChapter, chapterBeatKeys, childrenOf, move, sceneText, words } from './deskModel';
import { bookTarget, parseGoal, percent } from './writingModel';

/** The whole book at a glance: chapters in order, with their beats and scenes. */
export function ManuscriptPage({ bookId }: { bookId: string }) {
  const book = useEntry(bookId);
  return (
    <div data-sec="desk" className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Link
        to="/desk"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Writer’s Desk
      </Link>
      {book.data === undefined ? (
        book.error ? (
          <EmptyState>Couldn’t load this manuscript. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : !book.data || book.data.deletedAt ? (
        <EmptyState>This manuscript isn’t here. Its outline may be in the trash.</EmptyState>
      ) : (
        <Manuscript book={book.data} />
      )}
    </div>
  );
}

function Manuscript({ book }: { book: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const allChapters = useEntries('chapter');
  const allScenes = useEntries('scene');
  const chapters = useMemo(
    () => childrenOf(allChapters.data, book.id),
    [allChapters.data, book.id],
  );
  const scenesOf = (id: string) => childrenOf(allScenes.data, id);
  const totalWords = chapters.reduce(
    (sum, c) => sum + scenesOf(c.id).reduce((s, sc) => s + words(sc), 0),
    0,
  );

  return (
    <>
      <header className="panel flex flex-col gap-2 border-t-4 border-t-accent">
        <span className="label">Manuscript</span>
        <h1 className="text-[1.8rem] max-sm:text-[1.5rem]">{book.title || 'Untitled story'}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.88rem] text-muted">
          <span>
            {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} ·{' '}
            {totalWords.toLocaleString()} words
          </span>
          <Link
            to="/outlines/$outlineId"
            params={{ outlineId: book.id }}
            data-sec="story"
            className="font-semibold text-accent"
          >
            Open the outline
          </Link>
          <Link
            to="/desk/$bookId/breakdown"
            params={{ bookId: book.id }}
            className="font-semibold text-accent"
          >
            Chapter Breakdown
          </Link>
          <Link
            to="/desk/$bookId/compile"
            params={{ bookId: book.id }}
            className="font-semibold text-accent"
          >
            Compile and export
          </Link>
        </div>
        <BookTarget book={book} words={totalWords} />
      </header>

      {allChapters.data === undefined ? (
        <Loading />
      ) : chapters.length === 0 ? (
        <EmptyState>No chapters yet. Add the first one below.</EmptyState>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {chapters.map((c, i) => (
            <ChapterRow
              key={c.id}
              chapter={c}
              n={i + 1}
              scenes={scenesOf(c.id)}
              onMove={(dir) => move(ws, chapters, c.id, dir)}
              first={i === 0}
              last={i === chapters.length - 1}
            />
          ))}
        </ol>
      )}
      <button
        type="button"
        className="btn self-start"
        onClick={() => addChapter(ws, book.id, chapters.length + 1)}
      >
        + Add a chapter
      </button>
    </>
  );
}

/** The book's word count target, with how far along the draft is. */
function BookTarget({ book, words }: { book: Entry; words: number }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const target = bookTarget(book);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const save = (e: FormEvent) => {
    e.preventDefault();
    updateEntry(ws, book.id, {}, { targetWords: parseGoal(draft) });
    setEditing(false);
  };
  const change = (
    <button
      type="button"
      className="font-semibold text-accent"
      onClick={() => {
        setDraft(target ? String(target) : '');
        setEditing(true);
      }}
    >
      {target ? 'Change' : 'Set a word count target'}
    </button>
  );
  if (editing) {
    return (
      <form className="flex flex-wrap items-center gap-2" onSubmit={save}>
        <label className="flex items-center gap-2 text-[0.88rem]">
          Target
          <input
            className="txt w-32"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. 80000"
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
    );
  }
  if (!target) return <p className="text-[0.85rem]">{change}</p>;
  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label="Word count target"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent(words, target)}
        className="h-2 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${percent(words, target)}%` }}
        />
      </div>
      <p className="flex flex-wrap gap-2 text-[0.85rem] text-muted">
        {percent(words, target)}% of {target.toLocaleString()} words
        {words < target && ` · ${(target - words).toLocaleString()} to go`}
        {change}
      </p>
    </div>
  );
}

function ChapterRow({
  chapter,
  n,
  scenes,
  onMove,
  first,
  last,
}: {
  chapter: Entry;
  n: number;
  scenes: Entry[];
  onMove: (dir: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  const structure = structureByKey(
    typeof chapter.fields.structure === 'string' ? chapter.fields.structure : undefined,
  );
  const beatNames = chapterBeatKeys(chapter).flatMap(
    (k) => structure.beats.find((b) => b.key === k)?.name ?? [],
  );
  const goal = sceneText(chapter, 'goal');
  const chapterWords = scenes.reduce((s, sc) => s + words(sc), 0);
  const name = chapter.title || `Chapter ${n}`;

  return (
    <li className="panel flex gap-3 !p-3.5">
      <span className="w-7 flex-none pt-0.5 text-right font-mono text-[0.85rem] text-accent">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          to="/desk/chapters/$chapterId"
          params={{ chapterId: chapter.id }}
          className="self-start font-display text-[1.08rem] font-semibold hover:underline"
        >
          {name}
        </Link>
        {goal && <p className="text-[0.9rem]">{goal}</p>}
        {beatNames.length > 0 && (
          <div data-sec="story" className="flex flex-wrap gap-1.5">
            {beatNames.map((b) => (
              <span key={b} className="chip">
                {b}
              </span>
            ))}
          </div>
        )}
        <p className="text-[0.82rem] text-muted">
          {scenes.length === 0
            ? 'No scenes yet'
            : `${scenes.length} ${scenes.length === 1 ? 'scene' : 'scenes'}: ${scenes
                .map((s) => s.title || 'Untitled scene')
                .join(', ')}`}
          {chapterWords > 0 && ` · ${chapterWords.toLocaleString()} words`}
        </p>
      </div>
      <div className="flex flex-none flex-col gap-1">
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
    </li>
  );
}
