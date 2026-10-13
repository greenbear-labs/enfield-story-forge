import { collection, getDocs, type QuerySnapshot } from 'firebase/firestore';
import type { Entry, Link } from '../../data/types';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { characterSummary } from '../../features/characters/characterModel';
import { outlineStructure, outlineSummary } from '../../features/outlines/outlineModel';
import { notebookMarkdown } from '../../features/world/worldExport';
import { byOrder, newestFirst } from './model';
import { proseToMarkdown } from './prose';

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** A body document as the export reads it. */
export interface BodyRow {
  id: string;
  doc?: unknown;
}

/**
 * Manuscripts (with their prose), outlines, concepts, characters, World
 * Creator notebooks, shard groups, and shards as a readable Markdown file. Trashed entries are left out.
 */
export function toMarkdown(
  entries: Entry[],
  links: Link[],
  exportedAt = new Date(),
  bodies: BodyRow[] = [],
): string {
  const live = entries.filter((e) => !e.deletedAt);
  const byId = new Map(live.map((e) => [e.id, e]));
  const shards = live.filter((e) => e.type === 'shard').sort(newestFirst);
  const groups = live.filter((e) => e.type === 'shard_group').sort(newestFirst);
  const concepts = live.filter((e) => e.type === 'concept').sort(newestFirst);
  const characters = live
    .filter((e) => e.type === 'character')
    .sort((a, b) => a.title.localeCompare(b.title));

  const out = [
    `# Story Forge export`,
    '',
    `Exported ${exportedAt.toISOString().slice(0, 10)}.`,
    '',
  ];

  const prose = new Map(bodies.map((b) => [b.id, proseToMarkdown(b.doc)]));
  const childrenOf = (parentId: string, type: Entry['type']) =>
    live.filter((e) => e.type === type && e.parentId === parentId).sort(byOrder);
  const manuscripts = live
    .filter((e) => e.type === 'book' && e.fields.onDesk === true)
    .sort(newestFirst);
  if (manuscripts.length) out.push('## Manuscripts', '');
  for (const book of manuscripts) {
    out.push(`### ${book.title || 'Untitled story'}`, '');
    const plotlines = childrenOf(book.id, 'plotline');
    if (plotlines.length)
      out.push(
        `*Plotlines: ${plotlines
          .map((p) => (text(p.fields.mice) ? `${p.title} (${text(p.fields.mice)})` : p.title))
          .join(', ')}*`,
        '',
      );
    for (const chapter of childrenOf(book.id, 'chapter')) {
      out.push(`#### ${chapter.title || 'Untitled chapter'}`, '');
      for (const scene of childrenOf(chapter.id, 'scene')) {
        out.push(`##### ${scene.title || 'Untitled scene'}`, '');
        const written = prose.get(scene.id);
        const summary = text(scene.fields.summary).replace(/\n+/g, ' ');
        if (written) out.push(written, '');
        else out.push(`*Not written yet.${summary ? ` ${summary}` : ''}*`, '');
      }
    }
  }

  out.push('## Outlines', '');
  const outlines = live.filter((e) => e.type === 'book').sort(newestFirst);
  if (outlines.length === 0) out.push('None yet.', '');
  for (const o of outlines) {
    const series = o.parentId ? byId.get(o.parentId) : undefined;
    out.push(`### ${o.title || 'Untitled story'}`, '');
    out.push(
      `*${[series ? `Series: ${series.title}` : '', outlineStructure(o).name].filter(Boolean).join(' · ')}*`,
      '',
    );
    const { spine, beats } = outlineSummary(o);
    if (spine.length)
      out.push(...spine.map(([k, v]) => `- **${k}:** ${v.replace(/\n+/g, ' ')}`), '');
    if (beats.length)
      out.push(
        '#### Beats',
        '',
        ...beats.map(([k, v]) => `- **${k}:** ${v.replace(/\n+/g, ' ')}`),
        '',
      );
  }

  out.push('## Concepts', '');
  if (concepts.length === 0) out.push('None yet.', '');
  for (const c of concepts) {
    out.push(`### ${c.title || 'Untitled concept'}`, '');
    if (text(c.fields.logline)) out.push(`> ${text(c.fields.logline)}`, '');
    const meta = [c.status, text(c.fields.genre)].filter(Boolean).join(' · ');
    if (meta) out.push(`*${meta}*`, '');
    if (text(c.fields.notes)) out.push(text(c.fields.notes), '');
  }

  out.push('## Characters', '');
  if (characters.length === 0) out.push('None yet.', '');
  for (const c of characters) {
    out.push(`### ${c.title || 'Unnamed character'}`, '');
    const lines = characterSummary(c).map(
      ([label, v]) => `- **${label}:** ${v.replace(/\n+/g, ' ')}`,
    );
    if (lines.length) out.push(...lines, '');
    const related = links
      .filter((l) => l.kind === 'related' && l.fromId === c.id)
      .flatMap((l) => byId.get(l.toId) ?? []);
    const notes = c.fields.relations as Record<string, unknown> | undefined;
    for (const r of related) {
      const note = text(notes?.[r.id]);
      out.push(`- **Relationship:** ${r.title}${note ? `: ${note}` : ''}`);
    }
    if (related.length) out.push('');
    if (text(c.fields.notes)) out.push(text(c.fields.notes), '');
  }

  const notebooks = live
    .filter((e) => e.type === 'notebook')
    .sort((a, b) => a.title.localeCompare(b.title));
  if (notebooks.length) {
    const docs = new Map(bodies.map((b) => [b.id, b.doc]));
    out.push('## World Creator', '');
    for (const n of notebooks) out.push(...notebookMarkdown(n, live, docs, 3));
  }

  out.push('## Shard groups', '');
  if (groups.length === 0) out.push('None yet.', '');
  for (const g of groups) {
    out.push(`### ${g.title || 'Untitled group'}`, '');
    if (text(g.fields.note)) out.push(text(g.fields.note), '');
    const members = links
      .filter((l) => l.kind === 'member' && l.fromId === g.id)
      .flatMap((l) => byId.get(l.toId) ?? []);
    for (const s of members) out.push(`- ${text(s.fields.text).replace(/\n+/g, ' ')}`);
    out.push('');
  }

  out.push('## Shards', '');
  if (shards.length === 0) out.push('None yet.', '');
  for (const s of shards) {
    const meta = [text(s.fields.shardType) || 'other', ...s.tags.map((t) => `#${t}`)].join(' · ');
    out.push(text(s.fields.text), '', `*${meta}*`, '', '---', '');
  }
  return out.join('\n');
}

/** Every entry, link, and body in the workspace, read once (from the cache when offline). */
async function readWorkspace(workspaceId: string) {
  const { db } = getFirebase();
  const read = (path: string) => getDocs(collection(db, path));
  const [entries, links, bodies] = await Promise.all([
    read(paths.entries(workspaceId)),
    read(paths.links(workspaceId)),
    read(paths.bodies(workspaceId)),
  ]);
  const rows = (snap: QuerySnapshot) => snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  return {
    entries: rows(entries) as Entry[],
    links: rows(links) as Link[],
    bodies: rows(bodies),
  };
}

/** Saves a file to the device. */
export function downloadFile(filename: string, content: string | Blob, type: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export async function exportMarkdown(workspaceId: string): Promise<void> {
  const { entries, links, bodies } = await readWorkspace(workspaceId);
  downloadFile(
    `story-forge-${stamp()}.md`,
    toMarkdown(entries, links, new Date(), bodies as BodyRow[]),
    'text/markdown',
  );
}

/** One World Creator notebook, as Markdown. */
export async function exportNotebookMarkdown(workspaceId: string, notebook: Entry): Promise<void> {
  const { entries, bodies } = await readWorkspace(workspaceId);
  const docs = new Map((bodies as BodyRow[]).map((b) => [b.id, b.doc]));
  const name = (notebook.title || 'notebook').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
  downloadFile(`${name}.md`, notebookMarkdown(notebook, entries, docs).join('\n'), 'text/markdown');
}
