import type { FieldValue } from '../../data/types';
import { createEntry, saveBody } from '../../lib/entries/entries';
import { orderKey } from '../../lib/entries/model';
import { countWords, proseText, type ProseNode } from '../../lib/entries/prose';
import { readZipFile } from '../../lib/unzip';
import { DEFAULT_STRUCTURE } from '../outlines/structures';

/*
 * Bringing an existing draft in from Word, Markdown, or plain text. A file is
 * read into blocks (headings, paragraphs, scene breaks), and the blocks become
 * a manuscript: chapters at the top heading level (or lines like "Chapter 3"),
 * scenes at scene breaks and lower headings.
 */

export type DraftBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; nodes: ProseNode[] }
  | { kind: 'break' };

export interface DraftScene {
  title: string;
  doc: ProseNode;
  words: number;
}

export interface DraftChapter {
  title: string;
  scenes: DraftScene[];
}

export interface Draft {
  title: string;
  chapters: DraftChapter[];
}

/** File types the import reads. */
export const DRAFT_ACCEPT = '.docx,.md,.markdown,.txt';

/** "* * *", "***", "---", "#", "~~~" and friends, alone on a line. */
const SCENE_BREAK = /^\s*(?:(?:[*\-_~•◆◇·]\s*){3,}|#|§)\s*$/;
/** A short line that starts a chapter in a manuscript without headings. */
const NUMBER =
  '(?:\\d+|[ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)(?:[\\s-]+(?:one|two|three|four|five|six|seven|eight|nine))?';
const CHAPTER_LINE = new RegExp(
  `^(?:(?:chapter|part|book)\\s+${NUMBER}|prologue|epilogue|interlude)(?:\\s*[:.\\-–—]\\s*.{0,60})?$`,
  'i',
);

const textNode = (text: string, marks: string[] = []): ProseNode =>
  marks.length
    ? { type: 'text', text, marks: marks.map((type) => ({ type })) }
    : { type: 'text', text };

const nodesText = (nodes: ProseNode[]) =>
  nodes.map((n) => (n.type === 'hardBreak' ? '\n' : (n.text ?? ''))).join('');

/** Joins neighbouring text nodes that carry the same marks. */
function tidy(nodes: ProseNode[]): ProseNode[] {
  const out: ProseNode[] = [];
  for (const n of nodes) {
    if (n.type === 'text' && !n.text) continue;
    const last = out[out.length - 1];
    const same =
      last?.type === 'text' &&
      n.type === 'text' &&
      JSON.stringify(last.marks ?? []) === JSON.stringify(n.marks ?? []);
    if (same) out[out.length - 1] = { ...last, text: (last.text ?? '') + (n.text ?? '') };
    else out.push(n);
  }
  return out;
}

/* ----- Markdown and plain text ----- */

const unescape = (text: string) => text.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1');

/** **bold**, __bold__, *italic*, and _italic_ into marked text nodes. */
export function markdownInline(text: string): ProseNode[] {
  const out: ProseNode[] = [];
  const pattern = /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1|(\*|_)(?=\S)([\s\S]+?)(?<=\S)\3/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    // An underscore inside a word (snake_case) isn't emphasis.
    if (m[3] === '_' && /\w/.test(text[m.index - 1] ?? '')) continue;
    if (m.index > last) out.push(textNode(unescape(text.slice(last, m.index))));
    if (m[2] !== undefined) out.push(...markdownInline(m[2]).map((n) => withMark(n, 'bold')));
    else out.push(...markdownInline(m[4]!).map((n) => withMark(n, 'italic')));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(textNode(unescape(text.slice(last))));
  return tidy(out);
}

const withMark = (n: ProseNode, mark: string): ProseNode =>
  n.type === 'text' ? { ...n, marks: [...(n.marks ?? []), { type: mark }] } : n;

/**
 * Blocks from Markdown. In plain text (`markdown` false) every line is its own
 * paragraph, and asterisks are left as they are.
 */
export function textBlocks(source: string, markdown = true): DraftBlock[] {
  const blocks: DraftBlock[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (!lines.length) return;
    const text = lines.join(' ').replace(/\s+/g, ' ').trim();
    lines = [];
    if (text)
      blocks.push({ kind: 'para', nodes: markdown ? markdownInline(text) : [textNode(text)] });
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\t/g, ' ');
    const heading = markdown ? /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line) : null;
    if (heading && heading[2]) {
      flush();
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: unescape(heading[2]) });
    } else if (SCENE_BREAK.test(unescape(line)) && line.trim()) {
      flush();
      blocks.push({ kind: 'break' });
    } else if (!line.trim()) {
      flush();
    } else {
      // Quotes and list markers drop away; the words stay.
      lines.push(markdown ? line.replace(/^\s*(?:>\s?|[-+*]\s+|\d+[.)]\s+)/, '') : line);
      if (!markdown) flush();
    }
  }
  flush();
  return blocks;
}

/* ----- Word (.docx) ----- */

const on = (el: Element | undefined) => {
  if (!el) return false;
  const v = el.getAttribute('w:val');
  return v === null || !['0', 'false', 'none'].includes(v);
};

/** Blocks from a Word document's `word/document.xml`. */
export function docxBlocks(xml: string): DraftBlock[] {
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  const blocks: DraftBlock[] = [];
  for (const p of Array.from(dom.getElementsByTagName('w:p'))) {
    const style = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') ?? '';
    const nodes: ProseNode[] = [];
    for (const r of Array.from(p.getElementsByTagName('w:r'))) {
      const props = r.getElementsByTagName('w:rPr')[0];
      const marks = [
        ...(on(props?.getElementsByTagName('w:b')[0]) ? ['bold'] : []),
        ...(on(props?.getElementsByTagName('w:i')[0]) ? ['italic'] : []),
      ];
      for (const child of Array.from(r.children)) {
        if (child.tagName === 'w:t') nodes.push(textNode(child.textContent ?? '', marks));
        else if (child.tagName === 'w:tab') nodes.push(textNode(' ', marks));
        else if (
          (child.tagName === 'w:br' && child.getAttribute('w:type') !== 'page') ||
          child.tagName === 'w:cr'
        )
          nodes.push({ type: 'hardBreak' });
      }
    }
    const tidied = tidy(nodes);
    const text = nodesText(tidied).trim();
    if (!text) {
      // Word's "horizontal line" (also how Pandoc writes ***) is a scene break.
      const rule = Array.from(p.getElementsByTagName('v:rect')).some(
        (r) => r.getAttribute('o:hr') === 't',
      );
      if (rule) blocks.push({ kind: 'break' });
      continue;
    }
    const level = /^title$/i.test(style) ? 0 : Number(/^heading\s*(\d)$/i.exec(style)?.[1] ?? NaN);
    if (!Number.isNaN(level)) blocks.push({ kind: 'heading', level, text });
    else if (SCENE_BREAK.test(text)) blocks.push({ kind: 'break' });
    else blocks.push({ kind: 'para', nodes: trimEnds(tidied) });
  }
  return blocks;
}

/** Drops leading and trailing spaces and line breaks from a paragraph. */
function trimEnds(nodes: ProseNode[]): ProseNode[] {
  const out = [...nodes];
  while (out[0]?.type === 'hardBreak') out.shift();
  while (out[out.length - 1]?.type === 'hardBreak') out.pop();
  const first = out[0];
  if (first?.type === 'text') out[0] = { ...first, text: first.text!.trimStart() };
  const last = out[out.length - 1];
  if (last?.type === 'text') out[out.length - 1] = { ...last, text: last.text!.trimEnd() };
  return tidy(out);
}

/* ----- Blocks into a manuscript ----- */

/** Turns blocks into chapters and scenes. `fallbackTitle` is used when the draft has none. */
export function buildDraft(blocks: DraftBlock[], fallbackTitle: string): Draft {
  let title = fallbackTitle;
  let body = blocks;
  const headings = body.filter((b) => b.kind === 'heading');
  // A lone top heading before any writing is the book's title.
  const firstWords = body.findIndex((b) => b.kind === 'para');
  const top = headings.length ? Math.min(...headings.map((h) => h.level)) : null;
  const topOnes = headings.filter((h) => h.level === top);
  const first = body.findIndex((b) => b.kind === 'heading' && b.level === top);
  if (
    top !== null &&
    topOnes.length === 1 &&
    (firstWords === -1 || first < firstWords) &&
    (headings.length > 1 || top === 0)
  ) {
    title = topOnes[0]!.text;
    body = body.filter((_, i) => i !== first);
  }

  const levels = body.flatMap((b) => (b.kind === 'heading' ? [b.level] : []));
  const chapterLevel = levels.length ? Math.min(...levels) : null;
  const isChapter = (b: DraftBlock) =>
    chapterLevel !== null
      ? b.kind === 'heading' && b.level === chapterLevel
      : b.kind === 'para' && CHAPTER_LINE.test(nodesText(b.nodes).trim());

  const chapters: { title: string; scenes: { title: string; paras: ProseNode[] }[] }[] = [];
  const chapter = () => chapters[chapters.length - 1]!;
  const newChapter = (t: string) => chapters.push({ title: t, scenes: [{ title: '', paras: [] }] });
  const scene = () => chapter().scenes[chapter().scenes.length - 1]!;
  const newScene = (t: string) => {
    if (scene().paras.length === 0 && !scene().title) scene().title = t;
    else chapter().scenes.push({ title: t, paras: [] });
  };

  for (const b of body) {
    if (isChapter(b)) {
      newChapter(
        b.kind === 'heading' ? b.text : nodesText((b as { nodes: ProseNode[] }).nodes).trim(),
      );
      continue;
    }
    if (!chapters.length) newChapter('');
    if (b.kind === 'break') newScene('');
    else if (b.kind === 'heading') newScene(b.text);
    else scene().paras.push({ type: 'paragraph', content: b.nodes });
  }

  // Name what's unnamed, and drop empty scenes.
  const out = chapters.map((c, i) => {
    const scenes = c.scenes.filter((s) => s.paras.length);
    return {
      title: c.title || (i === 0 && chapters.length > 1 ? 'Opening' : `Chapter ${i + 1}`),
      scenes: scenes.map((s, j) => {
        const doc: ProseNode = { type: 'doc', content: s.paras };
        return { title: s.title || `Scene ${j + 1}`, doc, words: countWords(proseText(doc)) };
      }),
    };
  });
  return { title: title.trim() || 'Untitled story', chapters: out };
}

export const draftWords = (d: Draft) =>
  d.chapters.reduce((n, c) => n + c.scenes.reduce((m, s) => m + s.words, 0), 0);
export const draftScenes = (d: Draft) => d.chapters.reduce((n, c) => n + c.scenes.length, 0);

/** Reads a .docx, .md, or .txt file into a draft. Throws with a readable message if it can't. */
export async function readDraftFile(file: File): Promise<Draft> {
  const name = file.name.replace(/\.[^.]+$/, '');
  const ext = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? '';
  if (ext === 'docx') {
    let xml: Uint8Array | null;
    try {
      xml = await readZipFile(new Uint8Array(await file.arrayBuffer()), 'word/document.xml');
    } catch {
      xml = null;
    }
    if (!xml) throw new Error('That doesn’t look like a Word document (.docx).');
    return buildDraft(docxBlocks(new TextDecoder().decode(xml)), name);
  }
  if (ext === 'md' || ext === 'markdown' || ext === 'txt')
    return buildDraft(textBlocks(await file.text(), ext !== 'txt'), name);
  throw new Error('Choose a Word (.docx), Markdown (.md), or text (.txt) file.');
}

/**
 * Makes the draft a manuscript on the Writer's Desk: a new outline (a `book`),
 * its chapters, and their scenes with the prose. Returns the book's id.
 */
export function importDraft(workspaceId: string, draft: Draft, title: string): string {
  const fields: Record<string, FieldValue> = {
    format: 'novel',
    structure: DEFAULT_STRUCTURE,
    start: 'premise',
    spine: {},
    beatNotes: {},
    onDesk: true,
  };
  const bookId = createEntry(workspaceId, {
    type: 'book',
    title: title.trim() || draft.title,
    fields,
  });
  const base = Date.now();
  draft.chapters.forEach((c, i) => {
    const chapterId = createEntry(workspaceId, {
      type: 'chapter',
      title: c.title,
      parentId: bookId,
      order: orderKey(base + i),
      fields: { goal: '', beatKeys: [] },
    });
    c.scenes.forEach((s, j) => {
      const sceneId = createEntry(workspaceId, {
        type: 'scene',
        title: s.title,
        parentId: chapterId,
        order: orderKey(base + j),
        wordCount: s.words,
        fields: { bookId, summary: '', sceneType: 'scene' },
      });
      saveBody(workspaceId, sceneId, s.doc as unknown as Record<string, unknown>);
    });
  });
  return bookId;
}
