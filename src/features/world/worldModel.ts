import type { Entry, FieldValue } from '../../data/types';
import {
  createEntry,
  removedField,
  restoreEntry,
  trashEntry,
  updateEntry,
} from '../../lib/entries/entries';
import { byOrder, orderKey } from '../../lib/entries/model';
import {
  NOTEBOOK_STARTERS,
  presetByKey,
  type IndexPreset,
  type PresetColumn,
} from './worldPresets';

/**
 * World Creator data. A notebook (`notebook` entry) holds indexes (`index`
 * entries, parent: the notebook). An index holds pages (`page` entries,
 * parent: the index). An index's columns live in `fields.columns`, keyed by
 * column id; a page's values for them live in `fields.props`, by the same ids.
 */

export const COLUMN_TYPES = [
  { key: 'text', label: 'Text' },
  { key: 'number', label: 'Number' },
  { key: 'choice', label: 'Choice' },
  { key: 'tags', label: 'Tags' },
  { key: 'check', label: 'Checkbox' },
] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number]['key'];

export const INDEX_VIEWS = [
  { key: 'table', label: 'Table' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'list', label: 'List' },
] as const;
export type IndexView = (typeof INDEX_VIEWS)[number]['key'];

export interface WorldColumn {
  id: string;
  name: string;
  type: ColumnType;
  options: string[];
  pos: number;
}

const isColumnType = (v: unknown): v is ColumnType => COLUMN_TYPES.some((t) => t.key === v);
const asRecord = (v: unknown): Record<string, FieldValue> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, FieldValue>) : {};
const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** An index's columns, in order. */
export function columnsOf(index: Pick<Entry, 'fields'>): WorldColumn[] {
  return Object.entries(asRecord(index.fields.columns))
    .map(([id, raw]) => {
      const c = asRecord(raw);
      return {
        id,
        name: typeof c.name === 'string' ? c.name : '',
        type: isColumnType(c.type) ? c.type : 'text',
        options: asStrings(c.options),
        pos: typeof c.pos === 'number' ? c.pos : 0,
      };
    })
    .sort((a, b) => a.pos - b.pos || a.id.localeCompare(b.id));
}

export const indexView = (index: Pick<Entry, 'fields'>): IndexView =>
  INDEX_VIEWS.some((v) => v.key === index.fields.view) ? (index.fields.view as IndexView) : 'list';

export const indexPreset = (index: Pick<Entry, 'fields'>): IndexPreset =>
  presetByKey(index.fields.preset);

/** What one page in this index is called, e.g. "place". */
export const itemName = (index: Pick<Entry, 'fields'>): string =>
  typeof index.fields.item === 'string' && index.fields.item ? index.fields.item : 'page';

export const notebookDescription = (notebook: Pick<Entry, 'fields'>): string =>
  typeof notebook.fields.description === 'string' ? notebook.fields.description : '';

const newColumnId = () => `c${Math.random().toString(36).slice(2, 9)}`;

const columnData = (c: PresetColumn, pos: number): Record<string, FieldValue> => ({
  name: c.name,
  type: c.type,
  ...(c.type === 'choice' ? { options: c.options ?? [] } : {}),
  pos,
});

/** Stored columns for a new index, ids made up fresh. */
export function presetColumns(columns: PresetColumn[]): Record<string, FieldValue> {
  return Object.fromEntries(columns.map((c, i) => [newColumnId(), columnData(c, i)]));
}

// ----- A page's values -----

export const propsOf = (page: Pick<Entry, 'fields'>) => asRecord(page.fields.props);

/** A page's value in one column, shown as text. */
export function displayValue(column: Pick<WorldColumn, 'type'>, value: FieldValue | undefined) {
  if (value === undefined || value === null) return '';
  if (column.type === 'check') return value === true ? 'Yes' : '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return '';
  return String(value);
}

/** A line to show under a page's title: its first text column with something in it. */
export function summaryOf(page: Pick<Entry, 'fields'>, columns: WorldColumn[]): string {
  const props = propsOf(page);
  for (const c of columns) {
    if (c.type !== 'text') continue;
    const v = props[c.id];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** Short values to show as chips on cards: choices and tags. */
export function chipsOf(page: Pick<Entry, 'fields'>, columns: WorldColumn[]): string[] {
  const props = propsOf(page);
  return columns.flatMap((c) => {
    const v = props[c.id];
    if (c.type === 'choice' && typeof v === 'string' && v) return [v];
    if (c.type === 'tags') return asStrings(v);
    return [];
  });
}

/** A typed value from what was entered in a field. */
export function parseValue(type: ColumnType, input: string | boolean): FieldValue {
  if (type === 'check') return input === true;
  const text = String(input).trim();
  if (type === 'number') {
    const n = Number(text.replace(',', '.'));
    return text && Number.isFinite(n) ? n : null;
  }
  if (type === 'tags')
    return [
      ...new Set(
        text
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ];
  return text;
}

export type PageSort = { by: 'title' | string; dir: 'asc' | 'desc' } | null;

/** Pages in an index, in their own order, or sorted by a column. Empty values go last. */
export function sortPages(pages: Entry[], sort: PageSort, columns: WorldColumn[]): Entry[] {
  const list = [...pages].sort(byOrder);
  if (!sort) return list;
  const column = columns.find((c) => c.id === sort.by);
  const key = (p: Entry): string | number | null => {
    if (sort.by === 'title') return p.title.trim().toLowerCase() || null;
    if (!column) return null;
    const v = propsOf(p)[column.id];
    if (column.type === 'number') return typeof v === 'number' ? v : null;
    if (column.type === 'check') return v === true ? 0 : null;
    return displayValue(column, v).toLowerCase() || null;
  };
  const sign = sort.dir === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null || kb === null) return ka === kb ? 0 : ka === null ? 1 : -1;
    if (typeof ka === 'number' && typeof kb === 'number') return (ka - kb) * sign;
    return String(ka).localeCompare(String(kb), undefined, { numeric: true }) * sign;
  });
}

/** The live entries that sit under `parentId`, in order. */
export const childrenOf = (entries: Entry[] | undefined, parentId: string, type: Entry['type']) =>
  (entries ?? []).filter((e) => e.type === type && e.parentId === parentId).sort(byOrder);

// ----- Writes -----

/** Makes a notebook, with the indexes of the starter you picked. Returns its id. */
export function createNotebook(
  ws: string,
  input: { title: string; description: string; starter: string },
): string {
  const starter = NOTEBOOK_STARTERS.find((s) => s.key === input.starter) ?? NOTEBOOK_STARTERS[0]!;
  const id = createEntry(ws, {
    type: 'notebook',
    title: input.title.trim() || 'Untitled notebook',
    icon: starter.icon,
    template: starter.key,
    fields: { description: input.description.trim() },
  });
  const now = Date.now();
  starter.indexes.forEach((key, i) => addIndex(ws, id, presetByKey(key), undefined, now + i));
  return id;
}

/** Adds an index to a notebook. Returns its id. */
export function addIndex(
  ws: string,
  notebookId: string,
  preset: IndexPreset,
  name?: string,
  at = Date.now(),
): string {
  return createEntry(ws, {
    type: 'index',
    title: name?.trim() || preset.name || 'Untitled index',
    icon: preset.icon,
    parentId: notebookId,
    order: orderKey(at),
    fields: {
      preset: preset.key,
      item: preset.item,
      view: preset.view,
      columns: presetColumns(preset.columns),
    },
  });
}

/** Adds a page to an index. Returns its id. */
export function addPage(ws: string, index: Entry, title = ''): string {
  return createEntry(ws, {
    type: 'page',
    title: title.trim(),
    template: indexPreset(index).template,
    parentId: index.id,
    fields: { notebookId: index.parentId ?? null, props: {} },
  });
}

export function setProp(ws: string, pageId: string, columnId: string, value: FieldValue): void {
  updateEntry(ws, pageId, {}, { [`props.${columnId}`]: value });
}

export function addColumn(
  ws: string,
  index: Entry,
  column: { name: string; type: ColumnType; options?: string[] },
): void {
  const pos = Math.max(-1, ...columnsOf(index).map((c) => c.pos)) + 1;
  updateEntry(
    ws,
    index.id,
    {},
    { [`columns.${newColumnId()}`]: columnData({ ...column, name: column.name.trim() }, pos) },
  );
}

export function updateColumn(
  ws: string,
  indexId: string,
  columnId: string,
  changes: { name?: string; options?: string[] },
): void {
  const data: Record<string, unknown> = {};
  if (changes.name !== undefined) data[`columns.${columnId}.name`] = changes.name.trim();
  if (changes.options !== undefined) data[`columns.${columnId}.options`] = changes.options;
  updateEntry(ws, indexId, {}, data);
}

/** Removes a column. Pages keep their values, so putting the column back (Undo) restores them. */
export function removeColumn(ws: string, indexId: string, columnId: string): void {
  updateEntry(ws, indexId, {}, { [`columns.${columnId}`]: removedField() });
}

export function restoreColumn(ws: string, indexId: string, column: WorldColumn): void {
  updateEntry(ws, indexId, {}, { [`columns.${column.id}`]: columnData(column, column.pos) });
}

/** Moves a column one place left or right. */
export function moveColumn(ws: string, index: Entry, columnId: string, step: -1 | 1): void {
  const cols = columnsOf(index);
  const i = cols.findIndex((c) => c.id === columnId);
  const j = i + step;
  if (i < 0 || j < 0 || j >= cols.length) return;
  const [moved] = cols.splice(i, 1);
  cols.splice(j, 0, moved!);
  updateEntry(
    ws,
    index.id,
    {},
    Object.fromEntries(cols.map((c, pos) => [`columns.${c.id}.pos`, pos])),
  );
}

/** Trashes several entries at once (say, a notebook and everything in it). Undo restores them. */
export function trashAll(ws: string, ids: string[]): () => void {
  ids.forEach((id) => trashEntry(ws, id));
  return () => ids.forEach((id) => restoreEntry(ws, id));
}

/** An entry and everything under it, in a notebook's tree. */
export function treeIds(entries: Entry[] | undefined, rootId: string): string[] {
  const out = [rootId];
  for (let i = 0; i < out.length; i++)
    for (const e of entries ?? []) if (e.parentId === out[i]) out.push(e.id);
  return out;
}
