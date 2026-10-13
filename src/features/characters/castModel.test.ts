import { describe, expect, it } from 'vitest';
import type { Entry, Link } from '../../data/types';
import { castOf, storiesOf, storyList, withoutStory } from './castModel';

const entry = (id: string, type: Entry['type'], extra: Partial<Entry> = {}) =>
  ({ id, type, title: id, parentId: null, fields: {}, ...extra }) as Entry;
const cast = (fromId: string, toId: string) =>
  ({ id: `${fromId}__cast__${toId}`, fromId, toId, kind: 'cast' }) as Link;

const saga = entry('Saga', 'series');
const book1 = entry('Book One', 'book', { parentId: 'Saga', fields: { protagonistId: 'mira' } });
const book2 = entry('Book Two', 'book', { parentId: 'Saga' });
const solo = entry('Alone', 'book');
const books = [book1, book2, solo];
const links = [cast('tam', 'Saga'), cast('ida', 'Book Two'), cast('ida', 'Alone')];

describe('storyList', () => {
  it('lists each series with its books under it, then standalone books', () => {
    expect(storyList([saga], books).map((s) => [s.story.id, s.series?.id ?? null])).toEqual([
      ['Saga', null],
      ['Book One', 'Saga'],
      ['Book Two', 'Saga'],
      ['Alone', null],
    ]);
  });

  it('puts groups last, and a group’s cast is only who was added to it', () => {
    const crew = entry('Crew', 'cast_group');
    expect(storyList([saga], books, [crew]).at(-1)!.story.id).toBe('Crew');
    expect([...castOf(crew, [...links, cast('ida', 'Crew')], books)]).toEqual([['ida', 'cast']]);
  });
});

describe('castOf', () => {
  it('puts the series cast and the protagonist into a book’s cast', () => {
    expect([...castOf(book1, links, books)]).toEqual([
      ['tam', 'series'],
      ['mira', 'protagonist'],
    ]);
  });

  it('gives a series everyone from its books', () => {
    expect(Object.fromEntries(castOf(saga, links, books))).toEqual({
      tam: 'cast',
      ida: 'book',
      mira: 'book',
    });
  });

  it('keeps standalone stories to themselves', () => {
    expect([...castOf(solo, links, books).keys()]).toEqual(['ida']);
  });
});

describe('membership', () => {
  it('lists the stories a character was added to', () => {
    expect(storiesOf('ida', links)).toEqual(['Book Two', 'Alone']);
  });

  it('finds characters in no story, counting protagonists as placed', () => {
    const people = ['tam', 'ida', 'mira', 'new'].map((id) => entry(id, 'character'));
    expect(withoutStory(people, links, books).map((c) => c.id)).toEqual(['new']);
  });
});
