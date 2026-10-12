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
  return (node.content ?? []).map((n) => inline(n, markdown)).join('');
}

function blockText(node: ProseNode, markdown: boolean): string {
  if (node.type === 'horizontalRule') return markdown ? '\\* \\* \\*' : '* * *';
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

/** The prose as Markdown: paragraphs, bold, italic, quotes, and scene breaks. */
export const proseToMarkdown = (doc: unknown): string =>
  blocks(doc)
    .map((b) => blockText(b, true))
    .filter((t) => t.trim())
    .join('\n\n');

/** Words in a piece of text. Scene breaks (* * *) don't count. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
