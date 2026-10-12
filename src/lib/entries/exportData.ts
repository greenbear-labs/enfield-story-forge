import { collection, getDocs, type QuerySnapshot } from 'firebase/firestore';
import type { Entry, Link } from '../../data/types';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { newestFirst } from './model';

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** Shards and shard groups as a readable Markdown file. Trashed entries are left out. */
export function toMarkdown(entries: Entry[], links: Link[], exportedAt = new Date()): string {
  const live = entries.filter((e) => !e.deletedAt);
  const byId = new Map(live.map((e) => [e.id, e]));
  const shards = live.filter((e) => e.type === 'shard').sort(newestFirst);
  const groups = live.filter((e) => e.type === 'shard_group').sort(newestFirst);

  const out = [
    `# Story Forge export`,
    '',
    `Exported ${exportedAt.toISOString().slice(0, 10)}.`,
    '',
  ];

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

async function readAll(workspaceId: string) {
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

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** Everything in the workspace, as JSON. Timestamps become ISO strings. */
export async function exportJson(workspaceId: string): Promise<void> {
  const data = await readAll(workspaceId);
  const json = JSON.stringify(
    { app: 'Enfield Story Forge', version: 1, exportedAt: new Date().toISOString(), ...data },
    (_key, value: unknown) =>
      value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
        ? (value.toDate() as Date).toISOString()
        : value,
    2,
  );
  download(`story-forge-${stamp()}.json`, json, 'application/json');
}

export async function exportMarkdown(workspaceId: string): Promise<void> {
  const { entries, links } = await readAll(workspaceId);
  download(`story-forge-${stamp()}.md`, toMarkdown(entries, links), 'text/markdown');
}
