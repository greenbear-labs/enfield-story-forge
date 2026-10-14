import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { usePlays } from '../../lib/entries/plays';
import { useLibrary } from '../../lib/entries/publish';
import { cardGrid } from '../shards/ShardCard';
import { CATEGORIES } from './pathsModel';
import { featuredOf, newestFirst, readerPlayId, type PublishedStory } from './publishModel';
import type { Play } from './playModel';
import { usePathsTitle } from './usePathsTitle';

/** The library: stories other writers have published, for anyone to play. */
export function LibraryPage() {
  const library = useLibrary();
  const plays = usePlays().data;
  const [shelf, setShelf] = useState<string | null>(null);
  usePathsTitle('The library');
  const stories = useMemo(() => [...(library.data ?? [])].sort(newestFirst), [library.data]);
  const shelves = CATEGORIES.filter((c) => stories.some((s) => s.categories.includes(c)));
  const shown = shelf ? stories.filter((s) => s.categories.includes(shelf)) : stories;
  // On the first shelf, the admin's featured stories come first.
  const featured = shelf ? [] : featuredOf(stories);
  const others = shown.filter((s) => !featured.includes(s));

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[0.85rem]">
        <Link to="/paths" className="text-muted hover:text-accent">
          ← Your adventures
        </Link>
      </nav>
      <header className="paths-banner flex min-h-[200px] items-end p-7 max-sm:min-h-[180px] max-sm:p-5">
        <img src="/paths-art/fog-glade.webp" alt="" fetchPriority="high" />
        <div className="paths-banner-body flex max-w-[560px] flex-col items-start gap-2">
          <h1 className="paths-glow text-[2.4rem] leading-[1.05] max-sm:text-[1.9rem]">
            The library
          </h1>
          <p className="text-ink/85">
            Stories left here by other wanderers. Pick one, step in, and see how many endings you
            can find.
          </p>
        </div>
      </header>

      {shelves.length > 1 && (
        <div role="group" aria-label="Shelves" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="seg"
            aria-pressed={shelf === null}
            onClick={() => setShelf(null)}
          >
            All
          </button>
          {shelves.map((c) => (
            <button
              key={c}
              type="button"
              className="seg"
              aria-pressed={shelf === c}
              onClick={() => setShelf(shelf === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {library.error ? (
        <EmptyState>Couldn’t open the library. Check your connection and reload.</EmptyState>
      ) : library.data === undefined ? (
        <Loading />
      ) : shown.length === 0 ? (
        <EmptyState>
          The shelves are empty for now. Publish an adventure and submit it to the library to be the
          first.
        </EmptyState>
      ) : featured.length > 0 ? (
        <>
          <Shelf title="Featured" stories={featured} plays={plays} />
          {others.length > 0 && <Shelf title="More stories" stories={others} plays={plays} />}
        </>
      ) : (
        <Shelf title={shelf ?? 'Stories'} stories={shown} plays={plays} hideTitle={!shelf} />
      )}
    </>
  );
}

function Shelf({
  title,
  stories,
  plays,
  hideTitle,
}: {
  title: string;
  stories: PublishedStory[];
  plays: Map<string, Play> | undefined;
  hideTitle?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2.5" aria-label={title}>
      {!hideTitle && <h2 className="text-[1.05rem]">{title}</h2>}
      <div className={cardGrid}>
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            found={Object.keys(plays?.get(readerPlayId(story.id))?.endings ?? {}).length}
            started={!!plays?.get(readerPlayId(story.id))?.path.length}
          />
        ))}
      </div>
    </section>
  );
}

function StoryCard({
  story,
  found,
  started,
}: {
  story: PublishedStory;
  found: number;
  started: boolean;
}) {
  return (
    <Link to="/paths/read/$storyId" params={{ storyId: story.id }} className="entry-card">
      <img
        src={story.coverUrl ?? '/paths-art/lantern-path-small.webp'}
        alt=""
        loading="lazy"
        className={story.coverUrl ? 'card-cover' : 'card-cover opacity-60 saturate-50'}
      />
      <b className="font-display text-[1.05rem]">{story.title}</b>
      {story.ownerName && <span className="text-[0.82rem] text-muted">by {story.ownerName}</span>}
      {story.blurb && <p className="line-clamp-3 text-[0.88rem] text-muted">{story.blurb}</p>}
      <span className="mt-auto flex flex-wrap items-center gap-1">
        {started && <span className="chip">Continue</span>}
        {story.endingCount > 0 && (
          <span className="text-[0.8rem] text-muted">
            {found > 0 && `${Math.min(found, story.endingCount)} of `}
            {story.endingCount} {story.endingCount === 1 ? 'ending' : 'endings'}
            {found > 0 && ' found'}
          </span>
        )}
      </span>
      {story.categories.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {story.categories.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
