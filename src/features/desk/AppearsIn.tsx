import { Link } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { useEntries, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { appearances } from './deskModel';

/**
 * The scenes an entry appears in: as the point of view, as the scene's place,
 * or @mentioned in the prose. Used for characters and World Creator pages.
 */
export function AppearsIn({
  entryId,
  title = 'Appears in',
  empty,
}: {
  entryId: string;
  title?: string;
  empty: ReactNode;
}) {
  const scenes = useEntries('scene');
  const chapters = useEntries('chapter');
  const books = useEntries('book');
  const mentions = useLinks({ kind: 'mention', toId: entryId });
  const places = useLinks({ kind: 'location', toId: entryId });
  const chapterMap = useEntryMap(chapters.data);
  const bookMap = useEntryMap(books.data);
  const rows = useMemo(
    () =>
      appearances(entryId, scenes.data, chapters.data, books.data, [
        ...(mentions.data ?? []),
        ...(places.data ?? []),
      ]),
    [entryId, scenes.data, chapters.data, books.data, mentions.data, places.data],
  );

  return (
    <section data-sec="desk" className="flex flex-col gap-2.5" aria-label={title}>
      <h2 className="text-[1.05rem]">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="panel flex flex-col divide-y divide-line !p-0">
          {rows.map(({ scene, pov, setting, chapterNumber }) => {
            const chapter = chapterMap.get(scene.parentId ?? '');
            const book = bookMap.get(chapter?.parentId ?? '');
            return (
              <li key={scene.id}>
                <Link
                  to="/desk/scenes/$sceneId"
                  params={{ sceneId: scene.id }}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3.5 py-2.5 hover:bg-sunken"
                >
                  <span className="font-semibold">{scene.title || 'Untitled scene'}</span>
                  {pov && <span className="chip">Point of view</span>}
                  {setting && <span className="chip">Set here</span>}
                  <span className="w-full text-[0.8rem] text-muted">
                    {[book?.title, `Chapter ${chapterNumber}`].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
