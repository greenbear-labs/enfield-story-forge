import type { Entry } from '../../data/types';
import { proseToMarkdown } from '../../lib/entries/prose';
import { words } from './deskModel';

/**
 * Compiling turns a book on the Writer's Desk into one manuscript: a title
 * page, front matter, the chapters (each scene's prose, with scene breaks
 * between them), and back matter. The settings live on the book in
 * `fields.compile`; every exporter works from the same `Compiled` result.
 */

export const CHAPTER_STYLES = [
  { key: 'words', label: 'Chapter One' },
  { key: 'numerals', label: 'Chapter 1' },
  { key: 'titles', label: 'Chapter titles only' },
  { key: 'words-titles', label: 'Chapter One, then its title' },
] as const;
export type ChapterStyle = (typeof CHAPTER_STYLES)[number]['key'];

export const SCENE_BREAKS = [
  { key: 'stars', label: '* * *', text: '* * *' },
  { key: 'hash', label: '#', text: '#' },
  { key: 'blank', label: 'A blank line', text: '' },
] as const;
export type SceneBreak = (typeof SCENE_BREAKS)[number]['key'];

/** Front and back matter: plain text, paragraphs split by blank lines. */
export const MATTER_FIELDS = [
  { key: 'dedication', label: 'Dedication', where: 'front', placeholder: 'For…' },
  {
    key: 'epigraph',
    label: 'Epigraph',
    where: 'front',
    placeholder: 'A quotation that opens the book',
  },
  { key: 'epigraphSource', label: 'Epigraph from', where: 'front', placeholder: 'Who said it' },
  {
    key: 'acknowledgements',
    label: 'Acknowledgements',
    where: 'back',
    placeholder: 'Thanks to…',
  },
  {
    key: 'aboutAuthor',
    label: 'About the author',
    where: 'back',
    placeholder: 'A few lines about you',
  },
] as const;
export type MatterKey = (typeof MATTER_FIELDS)[number]['key'];

export interface CompileSettings extends Record<MatterKey, string> {
  author: string;
  subtitle: string;
  chapterStyle: ChapterStyle;
  sceneBreak: SceneBreak;
  /** Chapters left out of the manuscript. */
  skip: string[];
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function compileSettings(book: Entry): CompileSettings {
  const raw = (book.fields.compile ?? {}) as Record<string, unknown>;
  const style = CHAPTER_STYLES.find((s) => s.key === raw.chapterStyle)?.key ?? 'words';
  const sceneBreak = SCENE_BREAKS.find((s) => s.key === raw.sceneBreak)?.key ?? 'stars';
  return {
    author: str(raw.author),
    subtitle: str(raw.subtitle),
    dedication: str(raw.dedication),
    epigraph: str(raw.epigraph),
    epigraphSource: str(raw.epigraphSource),
    acknowledgements: str(raw.acknowledgements),
    aboutAuthor: str(raw.aboutAuthor),
    chapterStyle: style,
    sceneBreak,
    skip: Array.isArray(raw.skip) ? raw.skip.filter((x): x is string => typeof x === 'string') : [],
  };
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 1 → "One", 42 → "Forty-Two", 105 → "One Hundred Five". Numerals from 1000 on. */
export function numberWords(n: number): string {
  if (n < 1 || n >= 1000 || !Number.isInteger(n)) return String(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const restWords =
    rest < 20
      ? ONES[rest]!
      : TENS[Math.floor(rest / 10)]! + (rest % 10 ? `-${ONES[rest % 10]}` : '');
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', restWords].filter(Boolean).join(' ');
}

/** A chapter keeps the "Chapter 3" name it was made with until the writer renames it. */
const hasOwnTitle = (chapter: Entry) =>
  !!chapter.title.trim() && !/^chapter\s+\d+$/i.test(chapter.title.trim());

export function chapterHeading(
  chapter: Entry,
  n: number,
  style: ChapterStyle,
): { heading: string; subheading: string } {
  const title = hasOwnTitle(chapter) ? chapter.title.trim() : '';
  switch (style) {
    case 'numerals':
      return { heading: `Chapter ${n}`, subheading: '' };
    case 'titles':
      return { heading: title || `Chapter ${n}`, subheading: '' };
    case 'words-titles':
      return { heading: `Chapter ${numberWords(n)}`, subheading: title };
    default:
      return { heading: `Chapter ${numberWords(n)}`, subheading: '' };
  }
}

export interface CompiledChapter {
  id: string;
  heading: string;
  subheading: string;
  /** Each scene's prose (TipTap JSON); empty scenes are left out. */
  scenes: unknown[];
}

export interface Compiled {
  title: string;
  settings: CompileSettings;
  chapters: CompiledChapter[];
  words: number;
}

const hasText = (doc: unknown) => proseToMarkdown(doc).trim().length > 0;

export function compile(
  book: Entry,
  chapters: Entry[],
  scenesOf: (chapterId: string) => Entry[],
  bodies: Map<string, unknown>,
  settings = compileSettings(book),
): Compiled {
  const skip = new Set(settings.skip);
  let total = 0;
  const included = chapters.filter((c) => !skip.has(c.id));
  return {
    title: book.title.trim() || 'Untitled story',
    settings,
    chapters: included.map((chapter, i) => {
      const scenes = scenesOf(chapter.id);
      total += scenes.reduce((sum, s) => sum + words(s), 0);
      return {
        id: chapter.id,
        ...chapterHeading(chapter, i + 1, settings.chapterStyle),
        scenes: scenes.map((s) => bodies.get(s.id)).filter((d) => d && hasText(d)),
      };
    }),
    words: total,
  };
}

export const sceneBreakText = (c: Compiled) =>
  SCENE_BREAKS.find((b) => b.key === c.settings.sceneBreak)!.text;

/** Plain text split into paragraphs on blank lines. */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The whole manuscript as Markdown. */
export function compiledMarkdown(c: Compiled): string {
  const s = c.settings;
  const out: string[] = [`# ${c.title}`];
  if (s.subtitle.trim()) out.push(`*${s.subtitle.trim()}*`);
  if (s.author.trim()) out.push(`by ${s.author.trim()}`);
  if (s.dedication.trim()) out.push('---', ...paragraphs(s.dedication).map((p) => `*${p}*`));
  if (s.epigraph.trim()) {
    out.push('---', ...paragraphs(s.epigraph).map((p) => `> ${p}`));
    if (s.epigraphSource.trim()) out.push(`> — ${s.epigraphSource.trim()}`);
  }
  const brk = sceneBreakText(c);
  for (const ch of c.chapters) {
    out.push(`## ${ch.heading}`);
    if (ch.subheading) out.push(`*${ch.subheading}*`);
    ch.scenes.forEach((doc, i) => {
      // The prose's own headings sit under the chapter's.
      if (i > 0) out.push(brk ? brk.replace(/[*#]/g, '\\$&') : '&nbsp;');
      out.push(proseToMarkdown(doc, 1));
    });
  }
  if (s.acknowledgements.trim()) out.push('## Acknowledgements', ...paragraphs(s.acknowledgements));
  if (s.aboutAuthor.trim()) out.push('## About the author', ...paragraphs(s.aboutAuthor));
  return out.filter((t) => t.trim()).join('\n\n') + '\n';
}

/** A file name for the manuscript: its title, made safe. */
export const manuscriptFileName = (c: Compiled, ext: string) =>
  `${c.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'manuscript'}.${ext}`;
