/**
 * Helpers for prose kept as TipTap JSON (an entry's body). They read the JSON
 * directly, so the export and word counts don't need the editor loaded.
 */

export interface ProseMark {
  type: string;
}

export interface ProseNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ProseMark[];
  content?: ProseNode[];
}

const isNode = (v: unknown): v is ProseNode =>
  !!v && typeof v === 'object' && typeof (v as ProseNode).type === 'string';

const blocks = (doc: unknown): ProseNode[] =>
  isNode(doc) && Array.isArray(doc.content) ? doc.content.filter(isNode) : [];

function inline(node: ProseNode, markdown: boolean): string {
  if (node.type === 'text') {
    const text = node.text ?? '';
    if (!markdown || !text.trim()) return text;
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    // Keep the spaces outside the markers, or Markdown won't read them.
    const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(text)!;
    let out = core!;
    if (marks.has('italic')) out = `*${out}*`;
    if (marks.has('bold')) out = `**${out}**`;
    return `${lead}${out}${trail}`;
  }
  if (node.type === 'hardBreak') return markdown ? '  \n' : '\n';
  // An @mention reads as the name itself.
  if (node.type === 'mention') return typeof node.attrs?.label === 'string' ? node.attrs.label : '';
  return (node.content ?? []).map((n) => inline(n, markdown)).join('');
}

const headingLevel = (node: ProseNode, shift = 0) =>
  Math.min(6, (typeof node.attrs?.level === 'number' ? node.attrs.level : 2) + shift);

function listText(node: ProseNode, markdown: boolean): string {
  const ordered = node.type === 'orderedList';
  return (node.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${i + 1}. ` : markdown ? '- ' : '• ';
      const inner = (item.content ?? []).map((n) => blockText(n, markdown)).join('\n');
      // Lines after the first (and nested lists) are indented under the marker.
      return marker + inner.replace(/\n/g, `\n${' '.repeat(marker.length)}`);
    })
    .join('\n');
}

function blockText(node: ProseNode, markdown: boolean): string {
  if (node.type === 'horizontalRule') return markdown ? '\\* \\* \\*' : '* * *';
  if (node.type === 'heading')
    return markdown
      ? `${'#'.repeat(headingLevel(node))} ${inline(node, true)}`
      : inline(node, false);
  if (node.type === 'bulletList' || node.type === 'orderedList') return listText(node, markdown);
  if (node.type === 'blockquote')
    return (node.content ?? [])
      .map((n) => blockText(n, markdown))
      .map((t) => (markdown ? t.replace(/^/gm, '> ') : t))
      .join(markdown ? '\n>\n' : '\n\n');
  return inline(node, markdown);
}

/** The prose as plain text, paragraphs separated by blank lines. */
export const proseText = (doc: unknown): string =>
  blocks(doc)
    .map((b) => blockText(b, false))
    .join('\n\n');

/** The prose as Markdown: paragraphs, bold, italic, quotes, scene breaks, headings, and lists. */
export const proseToMarkdown = (doc: unknown, headingShift = 0): string =>
  blocks(doc)
    .map((b) =>
      // Headings move down under the export's own (a page's "##" under its "###").
      b.type === 'heading'
        ? `${'#'.repeat(headingLevel(b, headingShift))} ${inline(b, true)}`
        : blockText(b, true),
    )
    .filter((t) => t.trim())
    .join('\n\n');

/** Words in a piece of text. Scene breaks (* * *) don't count. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** The ids of the entries @mentioned in the prose, each once, in the order they first appear. */
export function mentionIds(doc: unknown): string[] {
  const out = new Set<string>();
  const walk = (node: ProseNode) => {
    if (node.type === 'mention' && typeof node.attrs?.id === 'string') out.add(node.attrs.id);
    for (const child of node.content ?? []) if (isNode(child)) walk(child);
  };
  if (isNode(doc)) walk(doc);
  return [...out];
}

/** Escapes text for HTML and XML. */
export const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inlineHtml(node: ProseNode): string {
  if (node.type === 'text') {
    let out = escapeXml(node.text ?? '');
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    if (marks.has('italic')) out = `<em>${out}</em>`;
    if (marks.has('bold')) out = `<strong>${out}</strong>`;
    return out;
  }
  if (node.type === 'hardBreak') return '<br/>';
  if (node.type === 'mention')
    return escapeXml(typeof node.attrs?.label === 'string' ? node.attrs.label : '');
  return (node.content ?? []).filter(isNode).map(inlineHtml).join('');
}

function blockHtml(node: ProseNode): string {
  const inner = () => (node.content ?? []).filter(isNode).map(inlineHtml).join('');
  const nested = () => (node.content ?? []).filter(isNode).map(blockHtml).join('');
  switch (node.type) {
    case 'paragraph':
      return `<p>${inner()}</p>`;
    case 'heading': {
      const level = Math.min(6, headingLevel(node) + 1);
      return `<h${level}>${inner()}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${nested()}</ul>`;
    case 'orderedList':
      return `<ol>${nested()}</ol>`;
    case 'listItem':
      return `<li>${nested()}</li>`;
    case 'blockquote':
      return `<blockquote>${nested()}</blockquote>`;
    case 'horizontalRule':
      return '<hr/>';
    default:
      return '';
  }
}

/**
 * The prose as XHTML (for EPUB): paragraphs, bold, italic, quotes, lists, and
 * scene breaks. Headings move down one level, under the chapter's own.
 */
export const proseToHtml = (doc: unknown): string => blocks(doc).map(blockHtml).join('\n');

/** The top-level blocks of a piece of prose, for exporters that walk it themselves. */
export const proseBlocks = blocks;
