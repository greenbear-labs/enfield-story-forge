import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { cardGrid } from '../shards/ShardCard';
import { conceptsStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { ConceptCard } from './ConceptCard';
import {
  CONCEPT_STATUSES,
  createConcept,
  filterConcepts,
  type ConceptStatus,
} from './conceptModel';
import { FromShardMinesDialog } from './FromShardMinesDialog';

export function ConceptsStationPage() {
  const navigate = useNavigate();
  const [minesOpen, setMinesOpen] = useState(false);

  return (
    <StationPage
      content={conceptsStation}
      toolActions={{
        'Concept Generator': () => void navigate({ to: '/concepts/generator' }),
        'The Mashup': () => void navigate({ to: '/concepts/mashup' }),
        'From the Shard Mines': () => setMinesOpen(true),
      }}
    >
      <ConceptBank />
      {minesOpen && <FromShardMinesDialog onClose={() => setMinesOpen(false)} />}
    </StationPage>
  );
}

function ConceptBank() {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const concepts = useEntries('concept');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ConceptStatus | null>(null);
  const visible = useMemo(
    () => filterConcepts(concepts.data ?? [], { query, status }),
    [concepts.data, query, status],
  );
  const total = concepts.data?.length ?? 0;

  const newConcept = () => {
    if (!ws) return;
    const id = createConcept(ws, {});
    void navigate({ to: '/concepts/$conceptId', params: { conceptId: id } });
  };

  return (
    <StationSection
      title="Concept Bank"
      actions={
        <button type="button" className="btn btn-small" onClick={newConcept}>
          + New concept
        </button>
      }
    >
      {concepts.error ? (
        <EmptyState>Couldn’t load your concepts. Check your connection and reload.</EmptyState>
      ) : concepts.data === undefined ? (
        <Loading />
      ) : total === 0 ? (
        <EmptyState>No concepts yet. Generate one, or send a shard group here.</EmptyState>
      ) : (
        <>
          <label className="relative flex items-center">
            <span className="sr-only">Search concepts</span>
            <Icon name="search" className="pointer-events-none absolute left-2.5 text-muted" />
            <input
              type="search"
              className="txt pl-8"
              placeholder="Search names, loglines, and notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="seg"
              aria-pressed={status === null}
              onClick={() => setStatus(null)}
            >
              All
            </button>
            {CONCEPT_STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                className="seg"
                aria-pressed={status === s.key}
                onClick={() => setStatus(status === s.key ? null : s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[0.8rem] text-muted">
            {visible.length === total
              ? `${total} ${total === 1 ? 'concept' : 'concepts'}`
              : `${visible.length} of ${total} concepts`}
          </p>
          {visible.length === 0 ? (
            <EmptyState>No concepts match.</EmptyState>
          ) : (
            <div className={cardGrid}>
              {visible.map((c) => (
                <ConceptCard key={c.id} concept={c} />
              ))}
            </div>
          )}
        </>
      )}
    </StationSection>
  );
}
