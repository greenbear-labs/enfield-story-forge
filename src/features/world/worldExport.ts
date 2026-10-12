import type { Entry } from '../../data/types';
import { proseToMarkdown } from '../../lib/entries/prose';
import { childrenOf, columnsOf, displayValue, notebookDescription, propsOf } from './worldModel';

const heading = (level: number, text: string) => `${'#'.repeat(Math.min(6, level))} ${text}`;

/**
 * A notebook as Markdown: its indexes, their pages with their column values
 * and writing, and the pages inside pages. `level` is the notebook's heading
 * level; everything else nests under it.
 */
export function notebookMarkdown(
  notebook: Entry,
  entries: Entry[],
  bodies: Map<string, unknown>,
  level = 1,
): string[] {
  const live = entries.filter((e) => !e.deletedAt);
  const out = [heading(level, notebook.title || 'Untitled notebook'), ''];
  if (notebookDescription(notebook)) out.push(`*${notebookDescription(notebook)}*`, '');

  const page = (p: Entry, depth: number, columns: ReturnType<typeof columnsOf>) => {
    out.push(heading(depth, p.title.trim() || 'Untitled'), '');
    const props = propsOf(p);
    const values = columns
      .map((c) => [c.name, displayValue(c, props[c.id])] as const)
      .filter(([, v]) => v);
    if (values.length) out.push(...values.map(([k, v]) => `- **${k}:** ${v}`), '');
    const written = proseToMarkdown(bodies.get(p.id), depth - 1);
    if (written) out.push(written, '');
    for (const inside of childrenOf(live, p.id, 'page')) page(inside, depth + 1, []);
  };

  for (const index of childrenOf(live, notebook.id, 'index')) {
    out.push(heading(level + 1, index.title || 'Untitled index'), '');
    const pages = childrenOf(live, index.id, 'page');
    if (pages.length === 0) out.push('Nothing here yet.', '');
    for (const p of pages) page(p, level + 2, columnsOf(index));
  }
  return out;
}
