import type { Entry } from '../../data/types';
import { createEntry } from '../../lib/entries/entries';

/**
 * Shadow Paths data. An adventure (`adventure` entry) is one
 * choose-your-own-adventure story: `fields.blurb` is its back-cover line,
 * `fields.categories` its library shelves. Its passages come next.
 */

/** The library's shelves, from the old Shadow Paths. */
export const CATEGORIES = [
  'Adventure',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Horror',
  'Romance',
  'Comedy',
  'Drama',
  'Historical',
  'Mythic',
  'Steampunk',
  'Post-Apocalyptic',
] as const;

export const adventureBlurb = (adventure: Pick<Entry, 'fields'>): string =>
  typeof adventure.fields.blurb === 'string' ? adventure.fields.blurb : '';

/** The adventure's categories, in library order, ignoring any the app doesn't know. */
export function adventureCategories(adventure: Pick<Entry, 'fields'>): string[] {
  const raw = adventure.fields.categories;
  const picked = new Set(Array.isArray(raw) ? raw : []);
  return CATEGORIES.filter((c) => picked.has(c));
}

/** Adds the category, or takes it away if it's already there. */
export function toggleCategory(categories: string[], category: string): string[] {
  const next = categories.includes(category)
    ? categories.filter((c) => c !== category)
    : [...categories, category];
  return CATEGORIES.filter((c) => next.includes(c));
}

export function createAdventure(
  ws: string,
  input: { title: string; blurb: string; categories: string[] },
): string {
  return createEntry(ws, {
    type: 'adventure',
    title: input.title.trim() || 'Untitled adventure',
    status: 'draft',
    fields: {
      blurb: input.blurb.trim(),
      categories: CATEGORIES.filter((c) => input.categories.includes(c)),
    },
  });
}
