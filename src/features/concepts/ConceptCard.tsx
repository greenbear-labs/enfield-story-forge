import { Link } from '@tanstack/react-router';
import type { Entry } from '../../data/types';
import { conceptGenre, conceptLogline, conceptStatus, conceptStatusLabel } from './conceptModel';

/** How a concept looks in the Concept Bank. */
export function ConceptCard({ concept }: { concept: Entry }) {
  const genre = conceptGenre(concept);
  return (
    <Link
      to="/concepts/$conceptId"
      params={{ conceptId: concept.id }}
      data-sec="concept"
      className="entry-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{conceptStatusLabel(conceptStatus(concept))}</span>
        {genre && <span className="text-[0.78rem] text-muted">{genre}</span>}
      </div>
      <h3 className="text-[1.05rem]">{concept.title || 'Untitled concept'}</h3>
      <p className="body text-[0.92rem] text-muted">
        {conceptLogline(concept) || 'No logline yet.'}
      </p>
    </Link>
  );
}
