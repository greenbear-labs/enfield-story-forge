import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/types';
import { chapterHeading, compile, compiledMarkdown, compileSettings, numberWords } from './compile';

const entry = (id: string, type: Entry['type'], extra: Partial<Entry> = {}) =>
  ({ id, type, title: '', fields: {}, ...extra }) as Entry;
const prose = (...paras: string[]) => ({
  type: 'doc',
  content: paras.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
});

describe('numberWords', () => {
  it('spells chapter numbers', () => {
    expect([1, 12, 20, 42, 100, 105, 999].map(numberWords)).toEqual([
      'One',
      'Twelve',
      'Twenty',
      'Forty-Two',
      'One Hundred',
      'One Hundred Five',
      'Nine Hundred Ninety-Nine',
    ]);
    expect(numberWords(1000)).toBe('1000');
  });
});

describe('chapterHeading', () => {
  const named = entry('c', 'chapter', { title: 'The Drowned Key' });
  const plain = entry('c', 'chapter', { title: 'Chapter 4' });
  it('follows the chosen style', () => {
    expect(chapterHeading(named, 3, 'words')).toEqual({ heading: 'Chapter Three', subheading: '' });
    expect(chapterHeading(named, 3, 'numerals').heading).toBe('Chapter 3');
    expect(chapterHeading(named, 3, 'titles').heading).toBe('The Drowned Key');
    expect(chapterHeading(named, 3, 'words-titles')).toEqual({
      heading: 'Chapter Three',
      subheading: 'The Drowned Key',
    });
  });
  it('treats the made-up "Chapter 4" name as no title', () => {
    expect(chapterHeading(plain, 2, 'titles').heading).toBe('Chapter 2');
    expect(chapterHeading(plain, 2, 'words-titles').subheading).toBe('');
  });
});

describe('compile', () => {
  const book = entry('b', 'book', {
    title: 'Salt Key',
    fields: {
      compile: { author: 'A. Green', skip: ['c2'], sceneBreak: 'hash', dedication: 'For R.' },
    },
  });
  const chapters = [entry('c1', 'chapter'), entry('c2', 'chapter'), entry('c3', 'chapter')];
  const scenes: Record<string, Entry[]> = {
    c1: [entry('s1', 'scene', { wordCount: 3 }), entry('s2', 'scene', { wordCount: 2 })],
    c2: [entry('s3', 'scene', { wordCount: 50 })],
    c3: [entry('s4', 'scene'), entry('s5', 'scene', { wordCount: 1 })],
  };
  const bodies = new Map<string, unknown>([
    ['s1', prose('The tide came in.')],
    ['s2', prose('Then out.')],
    ['s3', prose('Left out.')],
    ['s5', prose('End.')],
  ]);
  const result = compile(book, chapters, (id) => scenes[id] ?? [], bodies);

  it('leaves out skipped chapters and numbers the rest in order', () => {
    expect(result.chapters.map((c) => [c.id, c.heading])).toEqual([
      ['c1', 'Chapter One'],
      ['c3', 'Chapter Two'],
    ]);
    expect(result.words).toBe(6);
  });

  it('drops scenes with no writing', () => {
    expect(result.chapters[1]!.scenes).toHaveLength(1);
  });

  it('writes Markdown with the title page, matter, and scene breaks', () => {
    expect(compiledMarkdown(result)).toBe(
      [
        '# Salt Key',
        'by A. Green',
        '---',
        '*For R.*',
        '## Chapter One',
        'The tide came in.',
        '\\#',
        'Then out.',
        '## Chapter Two',
        'End.',
      ].join('\n\n') + '\n',
    );
  });

  it('reads missing settings as defaults', () => {
    expect(compileSettings(entry('x', 'book'))).toMatchObject({
      chapterStyle: 'words',
      sceneBreak: 'stars',
      skip: [],
      author: '',
    });
  });
});
