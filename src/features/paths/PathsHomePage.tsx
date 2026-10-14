import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { coverOf } from '../../lib/entries/images';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { CardCover } from '../images/EntryImg';
import { cardGrid } from '../shards/ShardCard';
import { NewAdventureDialog } from './NewAdventureDialog';
import { SampleShelf } from './SampleShelf';
import { useIsFeedbackAdmin } from '../feedback/feedback';
import { useReviewQueue } from '../../lib/entries/publish';
import { adventureBlurb, adventureCategories, coverArtOf } from './pathsModel';
import { usePathsTitle } from './usePathsTitle';

/** Shadow Paths' front page: your adventures. */
export function PathsHomePage() {
  const adventures = useEntries('adventure');
  const [creating, setCreating] = useState(false);
  const admin = useIsFeedbackAdmin();
  const waiting = useReviewQueue(admin).data?.length ?? 0;
  usePathsTitle('Your adventures');
  const sorted = useMemo(
    () => [...(adventures.data ?? [])].sort(recentlyUpdatedFirst),
    [adventures.data],
  );

  return (
    <>
      <header className="paths-banner flex min-h-[240px] items-end p-7 max-sm:min-h-[220px] max-sm:p-5">
        <img src="/paths-art/lantern-path.webp" alt="" fetchPriority="high" />
        <div className="paths-banner-body flex max-w-[560px] flex-col items-start gap-2">
          <h1 className="paths-glow text-[2.6rem] leading-[1.05] max-sm:text-[2rem]">
            Shadow Paths
          </h1>
          <p className="text-ink/85">
            Stories that fork in the dark. Build a web of passages and choices, play it as you go,
            then share it for others to hunt down every ending.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              + New adventure
            </button>
            <Link to="/paths/library" className="btn">
              Browse the library
            </Link>
            {admin && (
              <Link to="/paths/review" className="btn">
                Review{waiting ? ` (${waiting} waiting)` : ''}
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-2.5" aria-label="Adventures">
        <h2 className="text-[1.05rem]">Your adventures</h2>
        {adventures.error ? (
          <EmptyState>Couldn’t load your adventures. Check your connection and reload.</EmptyState>
        ) : adventures.data === undefined ? (
          <Loading />
        ) : sorted.length === 0 ? (
          <EmptyState>
            No adventures yet. Light the lantern and start one: every story begins with a single
            choice.
          </EmptyState>
        ) : (
          <div className={cardGrid}>
            {sorted.map((adventure) => (
              <Link
                key={adventure.id}
                to="/paths/$adventureId"
                params={{ adventureId: adventure.id }}
                className="entry-card"
              >
                {coverOf(adventure) ? (
                  <CardCover entry={adventure} />
                ) : (
                  <img
                    src={coverArtOf(adventure) ?? '/paths-art/lantern-path-small.webp'}
                    alt=""
                    loading="lazy"
                    className={
                      coverArtOf(adventure) ? 'card-cover' : 'card-cover opacity-60 saturate-50'
                    }
                  />
                )}
                <b className="font-display text-[1.05rem]">
                  {adventure.title || 'Untitled adventure'}
                </b>
                {adventureBlurb(adventure) && (
                  <p className="line-clamp-3 text-[0.88rem] text-muted">
                    {adventureBlurb(adventure)}
                  </p>
                )}
                {adventureCategories(adventure).length > 0 && (
                  <span className="mt-auto flex flex-wrap gap-1">
                    {adventureCategories(adventure).map((c) => (
                      <span key={c} className="chip">
                        {c}
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
      <SampleShelf />
      {creating && <NewAdventureDialog onClose={() => setCreating(false)} />}
    </>
  );
}
