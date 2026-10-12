import { describe, expect, it } from 'vitest';
import type { Entry, Link } from '../../data/types';
import { fakeShard } from '../../test/entries';
import { chapterName, health } from './healthModel';

const ch = (n: number, fields: Entry['fields'] = {}, title = `Chapter ${n}`) =>
  fakeShard('', {
    id: `c${n}`,
    type: 'chapter',
    parentId: 'b1',
    order: String(n).padStart(3, '0'),
    title,
    fields,
  });
const sc = (id: string, chapter: number, extra: Partial<Entry> = {}) =>
  fakeShard('', { id, type: 'scene', parentId: `c${chapter}`, order: id, ...extra });
const person = (id: string, title: string) => fakeShard('', { id, type: 'character', title });
const link = (fromId: string, kind: Link['kind'], toId: string): Link => ({
  id: `${fromId}__${kind}__${toId}`,
  workspaceId: 'u1',
  fromId,
  toId,
  kind,
});

describe('story health', () => {
  const chapters = Array.from({ length: 10 }, (_, i) => ch(i + 1));
  const mira = person('mira', 'Mira');
  const tom = person('tom', 'Tom');
  const people = new Map([
    ['mira', mira],
    ['tom', tom],
  ]);

  it('names chapters by number, adding a title the writer gave', () => {
    expect(chapterName(ch(3), 3)).toBe('Chapter 3');
    expect(chapterName(ch(3, {}, 'The Drowned Key'), 3)).toBe('Chapter 3, “The Drowned Key”');
  });

  it('measures chapters and flags one that runs long', () => {
    const scenes = [
      sc('a', 1, { wordCount: 1000 }),
      sc('b', 2, { wordCount: 1000, fields: { sceneType: 'sequel' } }),
      sc('c', 3, { wordCount: 1000 }),
      sc('d', 4, { wordCount: 5000 }),
    ];
    const h = health(chapters.slice(0, 4), scenes, [], people, []);
    expect(h.chapters.map((c) => c.words)).toEqual([1000, 1000, 1000, 5000]);
    expect(h.chapters[1]!.kinds).toEqual(['sequel']);
    expect(h.average).toBe(2000);
    expect(h.checks.map((c) => c.kind)).toEqual(['long']);
    expect(h.checks[0]!.chapterId).toBe('c4');
  });

  it('flags empty chapters, naming the beats meant to land there', () => {
    const h = health([ch(1, { structure: 'three-act', beatKeys: [] }), ch(2)], [], [], people, []);
    expect(h.checks.map((c) => c.text)).toEqual([
      'Chapter 1 has no scenes yet.',
      'Chapter 2 has no scenes yet.',
    ]);
  });

  it('flags plotlines that go quiet or never start', () => {
    const scenes = chapters.map((_, i) => sc(`s${i + 1}`, i + 1));
    const quiet = fakeShard('', { id: 'p1', type: 'plotline', title: 'The heist' });
    const unused = fakeShard('', { id: 'p2', type: 'plotline', title: 'Romance' });
    const links = [link('s1', 'plotline', 'p1'), link('s8', 'plotline', 'p1')];
    const h = health(chapters, scenes, [quiet, unused], people, links);
    expect(h.checks.map((c) => c.text)).toEqual([
      'The plotline “The heist” goes quiet for 6 chapters in a row.',
      'The plotline “Romance” has no scenes yet.',
    ]);
  });

  it('flags a character missing for a long stretch, as the POV or mentioned', () => {
    const scenes = chapters.map((_, i) => sc(`s${i + 1}`, i + 1));
    scenes[0] = sc('s1', 1, { fields: { pov: 'mira' } });
    const links = [link('s8', 'mention', 'mira'), link('s2', 'mention', 'tom')];
    const h = health(chapters, scenes, [], people, links);
    expect(h.checks.filter((c) => c.kind === 'vanish').map((c) => c.text)).toEqual([
      'Mira is missing for 6 chapters after Chapter 1.',
    ]);
  });

  it('balances point of view by words, with unset scenes last', () => {
    const scenes = [
      sc('a', 1, { wordCount: 300, fields: { pov: 'tom' } }),
      sc('b', 1, { wordCount: 900, fields: { pov: 'mira' } }),
      sc('c', 2, { wordCount: 200, fields: { pov: 'mira' } }),
      sc('d', 2, { wordCount: 50 }),
    ];
    const h = health(chapters.slice(0, 2), scenes, [], people, []);
    expect(h.pov.map((p) => [p.name, p.scenes, p.words])).toEqual([
      ['Mira', 2, 1100],
      ['Tom', 1, 300],
      ['No point of view set', 1, 50],
    ]);
    expect(h.checks.map((c) => c.kind)).toEqual(['no-pov']);
  });
});
