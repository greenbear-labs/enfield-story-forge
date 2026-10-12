import { Link } from '@tanstack/react-router';
import type { Entry } from '../../data/types';
import {
  beatsFilled,
  formatLabel,
  outlineFormat,
  outlineStructure,
  spineText,
} from './outlineModel';

/** How an outline looks in the library. */
export function OutlineCard({ outline }: { outline: Entry }) {
  const { filled, total } = beatsFilled(outline);
  const logline = spineText(outline, 'logline');
  return (
    <Link
      to="/outlines/$outlineId"
      params={{ outlineId: outline.id }}
      data-sec="story"
      className="entry-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{formatLabel(outlineFormat(outline))}</span>
        <span className="text-[0.78rem] text-muted">{outlineStructure(outline).name}</span>
      </div>
      <h3 className="text-[1.05rem]">{outline.title || 'Untitled story'}</h3>
      <p className="body text-[0.92rem] text-muted">{logline || 'No logline yet.'}</p>
      <div className="mt-auto flex items-center gap-2 pt-1 text-[0.78rem] text-muted">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${(filled / total) * 100}%` }}
          />
        </span>
        {filled} of {total} beats
      </div>
    </Link>
  );
}
