import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { cardGrid } from '../shards/ShardCard';
import { outlinesStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { OutlineCard } from './OutlineCard';
import { groupBySeries } from './outlineModel';
import { createStructure, structureFromEntry } from './customStructures';
import { STRUCTURES } from './structures';
import { useAuthStore } from '../auth/authStore';

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
      <YourStructures />
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

/** Structures the writer made, from scratch or from a copy of one in the library. */
function YourStructures() {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const { hash } = useLocation();
  const live = useEntries('structure');
  const structures = useMemo(
    () =>
      (live.data ?? [])
        .map((e) => ({ id: e.id, ...structureFromEntry(e) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [live.data],
  );
  // "Make your own structure" on New Outline links here.
  useEffect(() => {
    if (hash === 'structures' && live.data)
      document.getElementById('structures')?.scrollIntoView({ block: 'start' });
  }, [hash, live.data]);

  const make = (from?: string) => {
    if (!ws) return;
    const id = createStructure(ws, from ? STRUCTURES.find((s) => s.key === from) : undefined);
    void navigate({ to: '/outlines/structures/$structureId', params: { structureId: id } });
  };

  return (
    <StationSection
      id="structures"
      title="Your structures"
      actions={
        <span className="flex flex-wrap items-center gap-2">
          <label>
            <span className="sr-only">Copy a structure from the library</span>
            <select
              className="txt !w-auto !py-1 text-[0.85rem]"
              value=""
              onChange={(e) => e.target.value && make(e.target.value)}
            >
              <option value="">Copy one to change…</option>
              {STRUCTURES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-small" onClick={() => make()}>
            + New structure
          </button>
        </span>
      }
    >
      {live.error ? (
        <EmptyState>Couldn’t load your structures. Check your connection and reload.</EmptyState>
      ) : live.data === undefined ? (
        <Loading />
      ) : structures.length === 0 ? (
        <EmptyState>
          Make a structure of your own, with the beats and questions that fit how you write. Start
          from scratch, or copy one from the library and change it.
        </EmptyState>
      ) : (
        <div className={cardGrid}>
          {structures.map((s) => (
            <Link
              key={s.id}
              to="/outlines/structures/$structureId"
              params={{ structureId: s.id }}
              className="panel flex flex-col gap-1 hover:border-accent"
            >
              <span className="font-display text-[1.05rem] font-semibold">{s.name}</span>
              <span className="text-[0.82rem] text-muted">
                {s.beats.length} {s.beats.length === 1 ? 'beat' : 'beats'} · {s.bestFor}
              </span>
            </Link>
          ))}
        </div>
      )}
    </StationSection>
  );
}
