import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { useEntries, useEntry, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { castOf, useCasts } from '../characters/castModel';
import { childrenOf, scenePov } from './deskModel';
import { chapterName, health, type ChapterPace, type Check, type PovShare } from './healthModel';
import { secretsOf } from './knowledgeModel';
import { WhoKnowsWhat } from './WhoKnowsWhat';

/** Story health for one manuscript: gentle checks, pacing, and point-of-view balance. */
export function HealthPage({ bookId }: { bookId: string }) {
  const book = useEntry(bookId);
  return (
    <div data-sec="desk" className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Link
        to="/desk/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Manuscript
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
        <StoryHealth book={book.data} />
      )}
    </div>
  );
}

function StoryHealth({ book }: { book: Entry }) {
  const allChapters = useEntries('chapter');
  const scenes = useEntries('scene');
  const allPlotlines = useEntries('plotline');
  const characters = useEntries('character');
  const characterMap = useEntryMap(characters.data);
  const plotlineLinks = useLinks({ kind: 'plotline' });
  const mentionLinks = useLinks({ kind: 'mention' });
  const casts = useCasts();
  const loading =
    !casts.ready ||
    !allChapters.data ||
    !scenes.data ||
    !allPlotlines.data ||
    !characters.data ||
    !plotlineLinks.data ||
    !mentionLinks.data;
  const chapters = useMemo(
    () => childrenOf(allChapters.data, book.id),
    [allChapters.data, book.id],
  );
  // Who to track secrets for: the cast, the POV characters, and anyone already marked.
  const people = useMemo(() => {
    const ids = new Set(castOf(book, casts.links, casts.books).keys());
    for (const c of chapters)
      for (const s of childrenOf(scenes.data, c.id)) {
        const pov = scenePov(s);
        if (pov) ids.add(pov);
      }
    for (const secret of secretsOf(book)) for (const id of Object.keys(secret.learns)) ids.add(id);
    return [...ids]
      .map((id) => characterMap.get(id))
      .filter((c): c is Entry => !!c && !c.deletedAt)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [book, casts.links, casts.books, chapters, scenes.data, characterMap]);
  const result = useMemo(() => {
    if (loading) return null;
    const plotlines = childrenOf(allPlotlines.data, book.id);
    return health(chapters, scenes.data, plotlines, characterMap, [
      ...plotlineLinks.data!,
      ...mentionLinks.data!,
    ]);
  }, [
    loading,
    chapters,
    allPlotlines.data,
    scenes.data,
    characterMap,
    plotlineLinks.data,
    mentionLinks.data,
    book.id,
  ]);

  return (
    <>
      <header className="panel flex flex-col gap-1 border-t-4 border-t-accent">
        <span className="label">Story health</span>
        <h1 className="text-[1.8rem] max-sm:text-[1.5rem]">{book.title || 'Untitled story'}</h1>
        <p className="text-[0.9rem] text-muted">
          Pacing, point of view, who knows what, and a few things worth a look. These are notes, not
          rules.
        </p>
      </header>
      {!result ? (
        <Loading />
      ) : result.chapters.length === 0 ? (
        <EmptyState>This manuscript has no chapters yet.</EmptyState>
      ) : (
        <>
          <Checks checks={result.checks} />
          <Pacing chapters={result.chapters} average={result.average} />
          <PointOfView shares={result.pov} />
          <WhoKnowsWhat book={book} chapters={chapters} people={people} />
        </>
      )}
    </>
  );
}

function Checks({ checks }: { checks: Check[] }) {
  return (
    <section className="panel flex flex-col gap-2" aria-labelledby="checks-title">
      <h2 id="checks-title" className="text-[1.05rem]">
        Worth a look
      </h2>
      {checks.length === 0 ? (
        <p className="text-[0.9rem] text-muted">Nothing to flag right now.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[0.92rem]">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
              <span className="min-w-0 flex-1">
                {c.text}{' '}
                {c.chapterId && (
                  <Link
                    to="/desk/chapters/$chapterId"
                    params={{ chapterId: c.chapterId }}
                    className="font-semibold whitespace-nowrap text-accent"
                  >
                    Open the chapter
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span className="block h-3 overflow-hidden rounded-sm bg-sunken" aria-hidden title={label}>
      <span
        className="block h-full rounded-sm bg-accent"
        style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }}
      />
    </span>
  );
}

function Pacing({ chapters, average }: { chapters: ChapterPace[]; average: number }) {
  const max = Math.max(...chapters.map((c) => c.words), 1);
  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="pacing-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pacing-title" className="text-[1.05rem]">
          Pacing
        </h2>
        <span className="text-[0.82rem] text-muted">
          {average ? `Average ${average.toLocaleString()} words a chapter` : 'No words yet'}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {chapters.map((c) => (
          <li
            key={c.chapter.id}
            className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-1 max-sm:grid-cols-[minmax(0,1fr)_4.5rem]"
          >
            <Link
              to="/desk/chapters/$chapterId"
              params={{ chapterId: c.chapter.id }}
              className="truncate text-[0.88rem] hover:text-accent"
            >
              {chapterName(c.chapter, c.n)}
            </Link>
            <span className="flex flex-col gap-1 max-sm:order-last max-sm:col-span-2">
              <Bar value={c.words} max={max} label={`${c.words.toLocaleString()} words`} />
              {c.kinds.length > 0 && (
                <span className="flex gap-0.5" aria-label={kindsLabel(c.kinds)} role="img">
                  {c.kinds.map((k, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-4 rounded-full ${k === 'scene' ? 'bg-accent' : 'border border-accent'}`}
                    />
                  ))}
                </span>
              )}
            </span>
            <span className="text-right font-mono text-[0.8rem] text-muted">
              {c.words.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-4 rounded-full bg-accent" /> scene
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-4 rounded-full border border-accent" /> sequel
        </span>
        Long runs of one kind can make a stretch feel rushed or slow.
      </p>
    </section>
  );
}

const kindsLabel = (kinds: ChapterPace['kinds']) =>
  kinds.map((k) => (k === 'scene' ? 'scene' : 'sequel')).join(', ');

function PointOfView({ shares }: { shares: PovShare[] }) {
  const total = shares.reduce((sum, s) => sum + s.words, 0);
  const max = Math.max(...shares.map((s) => s.words), 1);
  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="pov-title">
      <h2 id="pov-title" className="text-[1.05rem]">
        Point of view
      </h2>
      {shares.length === 0 ? (
        <p className="text-[0.9rem] text-muted">No scenes yet.</p>
      ) : shares.every((s) => s.id === null) ? (
        <p className="text-[0.9rem] text-muted">
          No scene has a point of view yet. Set one in a scene’s setup to see the balance here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shares.map((s) => (
            <li
              key={s.id ?? 'none'}
              className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 max-sm:grid-cols-1"
            >
              <span className={`truncate text-[0.88rem] ${s.id ? '' : 'text-muted italic'}`}>
                {s.name}
              </span>
              <span className="flex flex-col gap-1">
                <Bar value={s.words} max={max} label={`${s.words.toLocaleString()} words`} />
                <span className="text-[0.78rem] text-muted">
                  {s.scenes} {s.scenes === 1 ? 'scene' : 'scenes'} · {s.words.toLocaleString()}{' '}
                  words
                  {total > 0 && ` · ${Math.round((s.words / total) * 100)}%`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
