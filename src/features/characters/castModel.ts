import { useMemo } from 'react';
import type { Entry, Link } from '../../data/types';
import { addLink, createEntry, removeLink } from '../../lib/entries/entries';
import { useEntries, useEntryMap, useLinks } from '../../lib/entries/hooks';
import { fieldText } from './characterModel';
import { protagonistId } from '../outlines/outlineModel';

/**
 * A story's cast: characters with a `cast` link (character → book or series).
 * Someone in a series' cast is in the cast of every book in it, and a book's
 * protagonist is always in its cast. A cast can also be a free-standing group
 * (a `cast_group` entry), with its members linked the same way. A group can
 * become a story: the new outline gets the group's members in its cast and a
 * `source` link (book → group), and the group stays as it is.
 */

export interface Story {
  story: Entry;
  /** Books in a series sit under it in lists. */
  series: Entry | null;
}

/**
 * Every cast a character can belong to: each series followed by its books,
 * then standalone books, then groups.
 */
export function storyList(series: Entry[], books: Entry[], groups: Entry[] = []): Story[] {
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
  const ownGroups = [...groups].sort(byName).map((g) => ({ story: g, series: null }));
  return [...inSeries, ...standalone, ...ownGroups];
}

export const storyName = (story: Entry) =>
  story.title.trim() ||
  (story.type === 'series'
    ? 'Untitled series'
    : story.type === 'cast_group'
      ? 'Untitled group'
      : 'Untitled story');

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
  } else if (story.type === 'series') {
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

/** Stories (series and outlines), groups, and every cast link, live. */
export function useCasts() {
  const links = useLinks({ kind: 'cast' });
  const series = useEntries('series');
  const books = useEntries('book');
  const groups = useEntries('cast_group');
  const stories = useMemo(
    () => storyList(series.data ?? [], books.data ?? [], groups.data ?? []),
    [series.data, books.data, groups.data],
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
    ready:
      links.data !== undefined &&
      series.data !== undefined &&
      books.data !== undefined &&
      groups.data !== undefined,
  };
}

const EMPTY_LINKS: Link[] = [];
const EMPTY_ENTRIES: Entry[] = [];

/** Makes a new group of characters and returns its id. */
export const createCastGroup = (workspaceId: string, name: string) =>
  createEntry(workspaceId, { type: 'cast_group', title: name.trim() });

/** The kind of cast, for labels. */
export const castKind = (story: Entry) =>
  story.type === 'series' ? 'Series' : story.type === 'cast_group' ? 'Group' : 'Story';

export function addToCast(workspaceId: string, characterId: string, storyId: string): void {
  addLink(workspaceId, characterId, 'cast', storyId);
}

export function removeFromCast(workspaceId: string, characterId: string, storyId: string): void {
  removeLink(workspaceId, characterId, 'cast', storyId);
}

/** What a group is about: a note on who they are and what brings them together. */
export const groupIdea = (group: Entry) => fieldText(group, 'notes');

/** A group's members: the characters added to it. */
export const membersOf = (groupId: string, links: Link[]) =>
  links.filter((l) => l.toId === groupId).map((l) => l.fromId);

/** The outlines a group has turned into, live. */
export function useStoriesFromGroup(groupId: string): Entry[] {
  const links = useLinks({ kind: 'source', toId: groupId });
  const books = useEntries('book');
  const byId = useEntryMap(books.data);
  return useMemo(
    () => (links.data ?? []).flatMap((l) => byId.get(l.fromId) ?? []),
    [links.data, byId],
  );
}
