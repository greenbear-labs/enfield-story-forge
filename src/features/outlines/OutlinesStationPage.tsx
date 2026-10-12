import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { cardGrid } from '../shards/ShardCard';
import { outlinesStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { OutlineCard } from './OutlineCard';
import { groupBySeries } from './outlineModel';

export function OutlinesStationPage() {
  const navigate = useNavigate();
  const books = useEntries('book');
  const latest = useMemo(() => [...(books.data ?? [])].sort(recentlyUpdatedFirst)[0], [books.data]);

  /** Spine and Beat Board open on the outline you touched last, or start a new one. */
  const openLatest = (section: 'spine' | 'beats') =>
    latest
      ? void navigate({
          to: '/outlines/$outlineId',
          params: { outlineId: latest.id },
          hash: section,
        })
      : void navigate({ to: '/outlines/new' });

  return (
    <StationPage
      content={outlinesStation}
      toolActions={{
        'New Outline': () => void navigate({ to: '/outlines/new' }),
        'Story Spine': () => openLatest('spine'),
        'Beat Board': () => openLatest('beats'),
      }}
    >
      <Library />
    </StationPage>
  );
}

function Library() {
  const navigate = useNavigate();
  const books = useEntries('book');
  const series = useEntries('series');
  const groups = useMemo(
    () => groupBySeries(books.data ?? [], series.data ?? []),
    [books.data, series.data],
  );
  const { library } = outlinesStation;

  return (
    <StationSection
      title={library.title}
      actions={
        <button
          type="button"
          className="btn btn-small"
          onClick={() => void navigate({ to: '/outlines/new' })}
        >
          + New outline
        </button>
      }
    >
      {books.error || series.error ? (
        <EmptyState>Couldn’t load your outlines. Check your connection and reload.</EmptyState>
      ) : books.data === undefined || series.data === undefined ? (
        <Loading />
      ) : books.data.length === 0 && series.data.length === 0 ? (
        <EmptyState>{library.empty}</EmptyState>
      ) : (
        groups.map((g) => (
          <div key={g.series?.id ?? 'standalone'} className="flex flex-col gap-2">
            <h3 className="label">
              {g.series ? `Series: ${g.series.title || 'Untitled series'}` : 'Standalone'}
            </h3>
            {g.books.length === 0 ? (
              <EmptyState>No books in this series yet.</EmptyState>
            ) : (
              <div className={cardGrid}>
                {g.books.map((b) => (
                  <OutlineCard key={b.id} outline={b} />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </StationSection>
  );
}
