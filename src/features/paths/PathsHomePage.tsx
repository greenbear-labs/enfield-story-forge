import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { CardCover } from '../images/EntryImg';
import { cardGrid } from '../shards/ShardCard';
import { NewAdventureDialog } from './NewAdventureDialog';
import { adventureBlurb, adventureCategories } from './pathsModel';

/** Shadow Paths' front page: your adventures. */
export function PathsHomePage() {
  const adventures = useEntries('adventure');
  const [creating, setCreating] = useState(false);
  const sorted = useMemo(
    () => [...(adventures.data ?? [])].sort(recentlyUpdatedFirst),
    [adventures.data],
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[640px] flex-col gap-1">
          <span className="label text-accent">Enfield</span>
          <h1 className="text-[1.9rem] max-sm:text-[1.5rem]">Shadow Paths</h1>
          <p className="text-muted">
            Choose-your-own-adventure stories. Build a web of passages and choices, play it as you
            go, then share it for others to play and hunt for every ending.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          + New adventure
        </button>
      </header>

      <section className="flex flex-col gap-2.5" aria-label="Adventures">
        <h2 className="text-[1.05rem]">Your adventures</h2>
        {adventures.error ? (
          <EmptyState>Couldn’t load your adventures. Check your connection and reload.</EmptyState>
        ) : adventures.data === undefined ? (
          <Loading />
        ) : sorted.length === 0 ? (
          <EmptyState>
            No adventures yet. Start one, and give the reader their first choice.
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
                <CardCover entry={adventure} />
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
      {creating && <NewAdventureDialog onClose={() => setCreating(false)} />}
    </>
  );
}
