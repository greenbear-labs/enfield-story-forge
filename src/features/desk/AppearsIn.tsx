import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { useEntries, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { appearances } from './deskModel';

/** The scenes an entry appears in: as the point of view, or @mentioned in the prose. */
export function AppearsIn({ entryId, name }: { entryId: string; name: string }) {
  const scenes = useEntries('scene');
  const chapters = useEntries('chapter');
  const books = useEntries('book');
  const mentions = useLinks({ kind: 'mention', toId: entryId });
  const chapterMap = useEntryMap(chapters.data);
  const bookMap = useEntryMap(books.data);
  const rows = useMemo(
    () => appearances(entryId, scenes.data, chapters.data, books.data, mentions.data),
    [entryId, scenes.data, chapters.data, books.data, mentions.data],
  );

  return (
    <section data-sec="desk" className="flex flex-col gap-2.5" aria-label="Appears in">
      <h2 className="text-[1.05rem]">Appears in</h2>
      {rows.length === 0 ? (
        <EmptyState>
          Not in any scenes yet. Make {name} a scene’s point of view, or type @ and their name while
          you write.
        </EmptyState>
      ) : (
        <ul className="panel flex flex-col divide-y divide-line !p-0">
          {rows.map(({ scene, pov, chapterNumber }) => {
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
