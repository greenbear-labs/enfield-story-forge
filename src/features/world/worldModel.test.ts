import { describe, expect, it } from 'vitest';
import type { FieldValue } from '../../data/types';
import { fakeShard } from '../../test/entries';
import {
  chipsOf,
  columnsOf,
  displayValue,
  parseValue,
  presetColumns,
  sortPages,
  summaryOf,
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
