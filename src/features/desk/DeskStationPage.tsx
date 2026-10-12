import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { useEntries } from '../../lib/entries/hooks';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { cardGrid } from '../shards/ShardCard';
import { deskStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { onDesk } from './deskModel';
import { ManuscriptCard } from './ManuscriptCard';
import { useManuscriptStats } from './useManuscriptStats';

export function DeskStationPage() {
  const navigate = useNavigate();
  const books = useEntries('book');
  const manuscripts = useMemo(
    () => (books.data ?? []).filter(onDesk).sort(recentlyUpdatedFirst),
    [books.data],
  );
  const latest: Entry | undefined = manuscripts[0];
  const chapters = useEntries('chapter');
  const scenes = useEntries('scene');
  // The scene you worked on last, in a manuscript that's still here.
  const lastScene = useMemo(() => {
    const live = new Set(manuscripts.map((b) => b.id));
    const parents = new Map((chapters.data ?? []).map((c) => [c.id, c.parentId ?? '']));
    return (scenes.data ?? [])
      .filter((s) => live.has(parents.get(s.parentId ?? '') ?? ''))
      .sort(recentlyUpdatedFirst)[0];
  }, [manuscripts, chapters.data, scenes.data]);

  return (
    <StationPage
      content={deskStation}
      toolActions={{
        'Chapter Builder': () =>
          latest
            ? void navigate({ to: '/desk/$bookId', params: { bookId: latest.id } })
            : void navigate({ to: '/outlines' }),
        'Scene Desk': () =>
          lastScene
            ? void navigate({ to: '/desk/scenes/$sceneId', params: { sceneId: lastScene.id } })
            : latest
              ? void navigate({ to: '/desk/$bookId', params: { bookId: latest.id } })
              : void navigate({ to: '/outlines' }),
      }}
    >
      <Library manuscripts={manuscripts} loading={books.data === undefined} error={!!books.error} />
    </StationPage>
  );
}

function Library({
  manuscripts,
  loading,
  error,
}: {
  manuscripts: Entry[];
  loading: boolean;
  error: boolean;
}) {
  const stats = useManuscriptStats();
  const { library } = deskStation;
  return (
    <StationSection title={library.title}>
      {error ? (
        <EmptyState>Couldn’t load your manuscripts. Check your connection and reload.</EmptyState>
      ) : loading ? (
        <Loading />
      ) : manuscripts.length === 0 ? (
        <EmptyState>{library.empty}</EmptyState>
      ) : (
        <div className={cardGrid}>
          {manuscripts.map((b) => (
            <ManuscriptCard
              key={b.id}
              book={b}
              stats={stats.get(b.id) ?? { chapters: 0, scenes: 0, words: 0 }}
            />
          ))}
        </div>
      )}
    </StationSection>
  );
}
