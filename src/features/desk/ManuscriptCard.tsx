import { Link } from '@tanstack/react-router';
import type { Entry } from '../../data/types';
import { formatLabel, outlineFormat } from '../outlines/outlineModel';

export interface ManuscriptStats {
  chapters: number;
  scenes: number;
  words: number;
}

/** How a manuscript looks in the Writer's Desk library. */
export function ManuscriptCard({ book, stats }: { book: Entry; stats: ManuscriptStats }) {
  return (
    <Link to="/desk/$bookId" params={{ bookId: book.id }} data-sec="desk" className="entry-card">
      <span className="chip self-start">{formatLabel(outlineFormat(book))}</span>
      <h3 className="text-[1.05rem]">{book.title || 'Untitled story'}</h3>
      <p className="text-[0.88rem] text-muted">
        {stats.chapters} {stats.chapters === 1 ? 'chapter' : 'chapters'} · {stats.scenes}{' '}
        {stats.scenes === 1 ? 'scene' : 'scenes'} · {stats.words.toLocaleString()} words
      </p>
    </Link>
  );
}
