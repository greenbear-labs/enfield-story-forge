import { useMemo } from 'react';
import type { Entry, Link } from '../../data/types';
import { addLink, removeLink } from '../../lib/entries/entries';
import { useEntries, useLinks } from '../../lib/entries/hooks';
import { protagonistId } from '../outlines/outlineModel';

/**
 * A story's cast: characters with a `cast` link (character → book or series).
 * Someone in a series' cast is in the cast of every book in it, and a book's
 * protagonist is always in its cast.
 */

export interface Story {
  story: Entry;
  /** Books in a series sit under it in lists. */
  series: Entry | null;
}

/** Every story a character can belong to: each series followed by its books, then standalone books. */
export function storyList(series: Entry[], books: Entry[]): Story[] {
  const byName = (a: Entry, b: Entry) => a.title.localeCompare(b.title);
  const seriesIds = new Set(series.map((s) => s.id));
  const inSeries = [...series].sort(byName).flatMap((s) => [
    { story: s, series: null },
    ...books
      .filter((b) => b.parentId === s.id)
      .sort(byName)
      .map((b) => ({ story: b, series: s })),
  ]);
  const standalone = books
    .filter((b) => !b.parentId || !seriesIds.has(b.parentId))
    .sort(byName)
    .map((b) => ({ story: b, series: null }));
  return [...inSeries, ...standalone];
}

export const storyName = (story: Entry) =>
  story.title.trim() || (story.type === 'series' ? 'Untitled series' : 'Untitled story');

/** How a character came to be in a story's cast. */
export type CastReason = 'cast' | 'series' | 'book' | 'protagonist';

/**
 * Who is in a story's cast, and why. "cast": added to this story; "series": added
 * to the book's series; "book": added to one of the series' books; "protagonist":
 * the book's protagonist.
 */
export function castOf(story: Entry, links: Link[], books: Entry[]): Map<string, CastReason> {
  const cast = new Map<string, CastReason>();
  const add = (id: string, why: CastReason) => {
    if (!cast.has(id)) cast.set(id, why);
  };
  for (const l of links) if (l.toId === story.id) add(l.fromId, 'cast');
  if (story.type === 'book') {
    if (story.parentId)
      for (const l of links) if (l.toId === story.parentId) add(l.fromId, 'series');
    const hero = protagonistId(story);
    if (hero) add(hero, 'protagonist');
  } else {
    const bookIds = new Set(books.filter((b) => b.parentId === story.id).map((b) => b.id));
    for (const l of links) if (bookIds.has(l.toId)) add(l.fromId, 'book');
    for (const b of books) {
      const hero = b.parentId === story.id ? protagonistId(b) : null;
      if (hero) add(hero, 'book');
    }
  }
  return cast;
}

/** The stories a character was added to (not counting the ones they're only the protagonist of). */
export const storiesOf = (characterId: string, links: Link[]) =>
  links.filter((l) => l.fromId === characterId).map((l) => l.toId);

/** Characters who aren't in any story's cast yet. */
export function withoutStory(characters: Entry[], links: Link[], books: Entry[]): Entry[] {
  const placed = new Set(links.map((l) => l.fromId));
  for (const b of books) {
    const hero = protagonistId(b);
    if (hero) placed.add(hero);
  }
  return characters.filter((c) => !placed.has(c.id));
}

/** Stories (series and outlines) and every cast link, live. */
export function useCasts() {
  const links = useLinks({ kind: 'cast' });
  const series = useEntries('series');
  const books = useEntries('book');
  const stories = useMemo(
    () => storyList(series.data ?? [], books.data ?? []),
    [series.data, books.data],
  );
  // Links to a story in the trash don't count.
  const live = useMemo(() => {
    const ids = new Set(stories.map((s) => s.story.id));
    return (links.data ?? EMPTY_LINKS).filter((l) => ids.has(l.toId));
  }, [links.data, stories]);
  return {
    links: live,
    books: books.data ?? EMPTY_ENTRIES,
    stories,
    ready: links.data !== undefined && series.data !== undefined && books.data !== undefined,
  };
}

const EMPTY_LINKS: Link[] = [];
const EMPTY_ENTRIES: Entry[] = [];

export function addToCast(workspaceId: string, characterId: string, storyId: string): void {
  addLink(workspaceId, characterId, 'cast', storyId);
}

export function removeFromCast(workspaceId: string, characterId: string, storyId: string): void {
  removeLink(workspaceId, characterId, 'cast', storyId);
}
