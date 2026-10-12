import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { cardGrid } from '../shards/ShardCard';
import { charactersStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { ArchetypeSparkDialog } from './ArchetypeSparkDialog';
import { CharacterCard } from './CharacterCard';
import { filterCast } from './characterModel';
import { QuickCardDialog } from './QuickCardDialog';

export function CharactersStationPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<'quick' | 'spark' | null>(null);
  const close = () => setOpen(null);

  return (
    <StationPage
      content={charactersStation}
      toolActions={{
        'Quick Card': () => setOpen('quick'),
        'Character Interview': () => void navigate({ to: '/characters/interview' }),
        'Archetype Spark': () => setOpen('spark'),
      }}
    >
      <Cast onNew={() => setOpen('quick')} />
      {open === 'quick' && <QuickCardDialog onClose={close} />}
      {open === 'spark' && <ArchetypeSparkDialog onClose={close} />}
    </StationPage>
  );
}

function Cast({ onNew }: { onNew: () => void }) {
  const characters = useEntries('character');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterCast(characters.data ?? [], query), [characters.data, query]);
  const total = characters.data?.length ?? 0;

  return (
    <StationSection
      title={charactersStation.library.title}
      actions={
        <button type="button" className="btn btn-small" onClick={onNew}>
          + New character
        </button>
      }
    >
      {characters.error ? (
        <EmptyState>Couldn’t load your cast. Check your connection and reload.</EmptyState>
      ) : characters.data === undefined ? (
        <Loading />
      ) : total === 0 ? (
        <EmptyState>{charactersStation.library.empty}</EmptyState>
      ) : (
        <>
          <label className="relative flex items-center">
            <span className="sr-only">Search the cast</span>
            <Icon name="search" className="pointer-events-none absolute left-2.5 text-muted" />
            <input
              type="search"
              className="txt pl-8"
              placeholder="Search names, roles, and anything on their cards"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="text-[0.8rem] text-muted">
            {visible.length === total
              ? `${total} ${total === 1 ? 'character' : 'characters'}`
              : `${visible.length} of ${total} characters`}
          </p>
          {visible.length === 0 ? (
            <EmptyState>No one matches.</EmptyState>
          ) : (
            <div className={cardGrid}>
              {visible.map((c) => (
                <CharacterCard key={c.id} character={c} />
              ))}
            </div>
          )}
        </>
      )}
    </StationSection>
  );
}
