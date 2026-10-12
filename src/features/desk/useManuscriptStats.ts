import { useMemo } from 'react';
import { useEntries } from '../../lib/entries/hooks';
import { words } from './deskModel';
import type { ManuscriptStats } from './ManuscriptCard';

/** Chapter and scene counts and words, per manuscript. */
export function useManuscriptStats(): Map<string, ManuscriptStats> {
  const chapters = useEntries('chapter');
  const scenes = useEntries('scene');
  return useMemo(() => {
    const stats = new Map<string, ManuscriptStats>();
    const get = (id: string) => {
      if (!stats.has(id)) stats.set(id, { chapters: 0, scenes: 0, words: 0 });
      return stats.get(id)!;
    };
    const bookOfChapter = new Map<string, string>();
    for (const c of chapters.data ?? []) {
      if (!c.parentId) continue;
      bookOfChapter.set(c.id, c.parentId);
      get(c.parentId).chapters++;
    }
    for (const s of scenes.data ?? []) {
      const book = s.parentId ? bookOfChapter.get(s.parentId) : undefined;
      if (!book) continue; // its chapter is in the trash
      get(book).scenes++;
      get(book).words += words(s);
    }
    return stats;
  }, [chapters.data, scenes.data]);
}
