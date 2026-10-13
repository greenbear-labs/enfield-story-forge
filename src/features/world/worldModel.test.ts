import { describe, expect, it } from 'vitest';
import type { FieldValue } from '../../data/types';
import { fakeShard } from '../../test/entries';
import {
  chipsOf,
  columnsOf,
  displayValue,
  parseValue,
  linkables,
  pageKind,
  planTreeMove,
  presetColumns,
  sortPages,
  summaryOf,
  trailOf,
  treeIds,
} from './worldModel';
import { presetByKey } from './worldPresets';

const index = fakeShard('', {
  id: 'i1',
  type: 'index',
  fields: {
    columns: {
      kind: { name: 'Kind', type: 'choice', options: ['City', 'Town'], pos: 0 },
      size: { name: 'Size', type: 'number', pos: 2 },
      note: { name: 'Summary', type: 'text', pos: 1 },
      odd: { name: 'Odd', type: 'nonsense' },
    },
  },
});
const page = (id: string, title: string, props: Record<string, FieldValue>, order = id) =>
  fakeShard('', { id, type: 'page', parentId: 'i1', title, order, fields: { props } });

describe('World Creator indexes', () => {
  it('reads columns in order, with unknown kinds as text', () => {
    expect(columnsOf(index).map((c) => [c.id, c.type])).toEqual([
      ['kind', 'choice'],
      ['odd', 'text'],
      ['note', 'text'],
      ['size', 'number'],
    ]);
    expect(columnsOf(fakeShard('', {}))).toEqual([]);
  });

  it('gives a preset’s columns fresh ids and positions', () => {
    const cols = presetColumns(presetByKey('places').columns);
    const read = columnsOf(fakeShard('', { fields: { columns: cols } }));
    expect(read.map((c) => c.name)).toEqual(['Kind', 'Region', 'Summary']);
    expect(read[0]?.options).toContain('City');
    expect(new Set(read.map((c) => c.id)).size).toBe(3);
  });

  it('turns what was typed into the column’s kind of value', () => {
    expect(parseValue('number', ' 3,5 ')).toBe(3.5);
    expect(parseValue('number', 'lots')).toBeNull();
    expect(parseValue('tags', 'sea, salt,  sea ,')).toEqual(['sea', 'salt']);
    expect(parseValue('check', true)).toBe(true);
    expect(parseValue('text', '  Port Vell ')).toBe('Port Vell');
    expect(displayValue({ type: 'tags' }, ['sea', 'salt'])).toBe('sea, salt');
    expect(displayValue({ type: 'check' }, false)).toBe('');
  });

  it('sorts by name or by a column, with empty values last', () => {
    const cols = columnsOf(index);
    const pages = [
      page('a', 'Vell', { size: 40 }),
      page('b', '', { size: 9 }),
      page('c', 'Ashby', {}),
      page('d', 'Moor', { size: 100 }),
    ];
    const ids = (s: Parameters<typeof sortPages>[1]) => sortPages(pages, s, cols).map((p) => p.id);
    expect(ids(null)).toEqual(['a', 'b', 'c', 'd']);
    expect(ids({ by: 'title', dir: 'asc' })).toEqual(['c', 'd', 'a', 'b']);
    expect(ids({ by: 'size', dir: 'asc' })).toEqual(['b', 'a', 'd', 'c']);
    expect(ids({ by: 'size', dir: 'desc' })).toEqual(['d', 'a', 'b', 'c']);
  });

  it('finds a summary line and chips for cards', () => {
    const cols = columnsOf(index);
    const p = page('a', 'Vell', { kind: 'City', note: '  A port that floods. ', size: 4 });
    expect(summaryOf(p, cols)).toBe('A port that floods.');
    expect(chipsOf(p, cols)).toEqual(['City']);
  });

  it('collects a notebook and everything under it', () => {
    const entries = [
      fakeShard('', { id: 'n1', type: 'notebook' }),
      fakeShard('', { id: 'i1', type: 'index', parentId: 'n1' }),
      fakeShard('', { id: 'p1', type: 'page', parentId: 'i1' }),
      fakeShard('', { id: 'p2', type: 'page', parentId: 'other' }),
    ];
    expect(treeIds(entries, 'n1')).toEqual(['n1', 'i1', 'p1']);
  });
});

describe('the notebook tree', () => {
  const entries = [
    fakeShard('', { id: 'n1', type: 'notebook', title: 'Salt Isles' }),
    fakeShard('', { id: 'i1', type: 'index', parentId: 'n1', fields: { item: 'place' } }),
    fakeShard('', { id: 'p1', type: 'page', parentId: 'i1', title: 'Port Vell' }),
    fakeShard('', { id: 'p2', type: 'page', parentId: 'p1', title: 'The Old Docks' }),
    fakeShard('', { id: 'c1', type: 'character', title: 'Mira' }),
    fakeShard('', { id: 'x', type: 'page', parentId: 'i1', title: ' ' }),
  ];
  const byId = new Map(entries.map((e) => [e.id, e]));

  it('walks up from a page to its notebook', () => {
    expect(trailOf(byId, entries[3]!).map((e) => e.id)).toEqual(['n1', 'i1', 'p1']);
    expect(trailOf(byId, entries[0]!)).toEqual([]);
  });

  it('names a page by its index, or as a page inside a page', () => {
    expect(pageKind(byId, entries[2]!)).toBe('Place');
    expect(pageKind(byId, entries[3]!)).toBe('Page');
  });

  it('offers named pages and characters to link, but not the page itself', () => {
    expect(linkables(entries, 'p1')).toEqual([
      { id: 'c1', label: 'Mira', kind: 'Character' },
      { id: 'p2', label: 'The Old Docks', kind: 'Page' },
    ]);
  });
});

describe('planTreeMove', () => {
  const nb = fakeShard('', { id: 'nb', type: 'notebook', fields: {} });
  const other = fakeShard('', { id: 'nb2', type: 'notebook', fields: {} });
  const places = fakeShard('', {
    id: 'places',
    type: 'index',
    parentId: 'nb',
    order: 'a',
    fields: { preset: 'places' },
  });
  const people = fakeShard('', {
    id: 'people',
    type: 'index',
    parentId: 'nb',
    order: 'b',
    fields: { preset: 'peoples' },
  });
  const far = fakeShard('', { id: 'far', type: 'index', parentId: 'nb2', fields: {} });
  const page = (id: string, parentId: string, order: string, notebookId = 'nb') =>
    fakeShard('', {
      id,
      type: 'page',
      parentId,
      order,
      template: 'location',
      fields: { notebookId },
    });
  const a = page('a', 'places', '1');
  const b = page('b', 'places', '2');
  const c = page('c', 'places', '3');
  const inner = page('inner', 'a', '1');
  const elsewhere = page('x', 'far', '1', 'nb2');
  const all = [nb, other, places, people, far, a, b, c, inner, elsewhere];

  it('reorders siblings, renumbering the list', () => {
    const w = planTreeMove(all, 'c', { parentId: 'places', beforeId: 'a' })!;
    const order = Object.fromEntries(w.map((x) => [x.id, x.changes.order]));
    expect([order.c, order.a, order.b].every(Boolean)).toBe(true);
    expect(order.c! < order.a! && order.a! < order.b!).toBe(true);
    expect(w.some((x) => x.changes.parentId)).toBe(false);
  });

  it('moves a page into another page or index, taking the index’s kind', () => {
    const intoPage = planTreeMove(all, 'b', { parentId: 'a', beforeId: null })!;
    expect(intoPage.find((x) => x.id === 'b')!.changes).toMatchObject({ parentId: 'a' });
    expect(intoPage.find((x) => x.id === 'b')!.changes.template).toBeUndefined();
    const intoIndex = planTreeMove(all, 'inner', { parentId: 'people', beforeId: null })!;
    expect(intoIndex[0]!.changes.parentId).toBe('people');
    expect(intoIndex[0]!.changes.template).toBe(presetByKey('peoples').template);
  });

  it('refuses moves that would break the tree', () => {
    expect(planTreeMove(all, 'a', { parentId: 'inner', beforeId: null })).toBeNull();
    expect(planTreeMove(all, 'a', { parentId: 'a', beforeId: null })).toBeNull();
    expect(planTreeMove(all, 'a', { parentId: 'far', beforeId: null })).toBeNull();
    expect(planTreeMove(all, 'a', { parentId: 'nb', beforeId: null })).toBeNull();
    expect(planTreeMove(all, 'places', { parentId: 'people', beforeId: null })).toBeNull();
  });

  it('reorders indexes within their notebook', () => {
    const w = planTreeMove(all, 'people', { parentId: 'nb', beforeId: 'places' })!;
    const order = Object.fromEntries(w.map((x) => [x.id, x.changes.order]));
    expect(order.people! < order.places!).toBe(true);
  });
});
