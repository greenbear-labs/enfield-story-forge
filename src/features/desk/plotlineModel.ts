import type { Entry, FieldValue, Link, Section } from '../../data/types';
import { addLink, createEntry, removeLink } from '../../lib/entries/entries';
import { childrenOf } from './deskModel';

const str = (v: FieldValue | undefined) => (typeof v === 'string' ? v : '');

/** Plotline colors reuse the section palette, so they work in light and dark. */
export const PLOTLINE_COLORS: { key: Section; label: string }[] = [
  { key: 'desk', label: 'Green' },
  { key: 'story', label: 'Blue' },
  { key: 'char', label: 'Plum' },
  { key: 'shard', label: 'Amber' },
  { key: 'concept', label: 'Violet' },
  { key: 'world', label: 'Teal' },
  { key: 'learn', label: 'Brown' },
];

/** Orson Scott Card’s MICE quotient: what kind of thread each plotline is. */
export const MICE_TYPES = [
  {
    key: 'milieu',
    label: 'Milieu',
    hint: 'Arrive somewhere new; it ends when they leave or settle.',
  },
  { key: 'idea', label: 'Idea', hint: 'A question or mystery; it ends when it’s answered.' },
  {
    key: 'character',
    label: 'Character',
    hint: 'Someone unhappy with who they are; it ends when they change.',
  },
  {
    key: 'event',
    label: 'Event',
    hint: 'The world thrown out of order; it ends when order returns.',
  },
] as const;

export const plotlineColor = (p: Entry): Section => {
  const c = str(p.fields.color);
  return PLOTLINE_COLORS.some((x) => x.key === c) ? (c as Section) : 'desk';
};
export const plotlineMice = (p: Entry) => MICE_TYPES.find((m) => m.key === p.fields.mice);
export const plotlineNote = (p: Entry) => str(p.fields.note);

/** Adds a plotline to a book, in the next color along. */
export function addPlotline(workspaceId: string, bookId: string, existing: number): string {
  return createEntry(workspaceId, {
    type: 'plotline',
    title: existing === 0 ? 'Main plot' : 'New plotline',
    parentId: bookId,
    fields: { color: PLOTLINE_COLORS[existing % PLOTLINE_COLORS.length]!.key, mice: '', note: '' },
  });
}

/** Tags a scene with a plotline, or takes the tag off. */
export function setScenePlotline(
  workspaceId: string,
  sceneId: string,
  plotlineId: string,
  on: boolean,
): void {
  if (on) addLink(workspaceId, sceneId, 'plotline', plotlineId);
  else removeLink(workspaceId, sceneId, 'plotline', plotlineId);
}

/** Plotline ids for each scene, from the `plotline` links. */
export function plotlinesByScene(links: Link[] | undefined): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    if (l.kind !== 'plotline') continue;
    const set = out.get(l.fromId) ?? new Set<string>();
    set.add(l.toId);
    out.set(l.fromId, set);
  }
  return out;
}

export interface BreakdownRow {
  plotline: Entry | null;
  /** One cell per chapter, in chapter order: the scenes in it on this plotline. */
  cells: Entry[][];
  /** How many chapters this plotline appears in. */
  chapters: number;
}

/**
 * The plotline-by-chapter grid: a row per plotline (in order), then a last
 * row (plotline null) for scenes with no plotline yet.
 */
export function breakdown(
  chapters: Entry[],
  scenes: Entry[] | undefined,
  plotlines: Entry[],
  tags: Map<string, Set<string>>,
): BreakdownRow[] {
  const sceneCols = chapters.map((c) => childrenOf(scenes, c.id));
  const live = new Set(plotlines.map((p) => p.id));
  const row = (plotline: Entry | null, keep: (s: Entry) => boolean): BreakdownRow => {
    const cells = sceneCols.map((col) => col.filter(keep));
    return { plotline, cells, chapters: cells.filter((c) => c.length).length };
  };
  return [
    ...plotlines.map((p) => row(p, (s) => tags.get(s.id)?.has(p.id) ?? false)),
    row(null, (s) => ![...(tags.get(s.id) ?? [])].some((id) => live.has(id))),
  ];
}

/** The longest run of chapters between a plotline's first and last scenes where it doesn't appear. */
export function longestGap(row: BreakdownRow): number {
  const first = row.cells.findIndex((c) => c.length);
  const last = row.cells.findLastIndex((c) => c.length);
  let best = 0;
  let run = 0;
  for (const cell of row.cells.slice(first, last + 1)) {
    run = cell.length ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}
