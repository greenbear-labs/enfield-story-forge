import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntry, updateEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import {
  beatsByChapter,
  childrenOf,
  appearances,
  manuscriptScenes,
  move,
  sendToDesk,
  suggestedChapters,
} from './deskModel';

vi.mock('../../lib/entries/entries', () => ({
  createEntry: vi.fn(() => 'id'),
  updateEntry: vi.fn(),
}));

const book = (fields = {}) =>
  fakeShard('', {
    id: 'b1',
    type: 'book',
    title: 'Salt',
    fields: { structure: 'three-act', ...fields },
  });

describe('the Writer’s Desk', () => {
  beforeEach(() => {
    vi.mocked(createEntry).mockClear();
    vi.mocked(updateEntry).mockClear();
  });

  it('suggests a chapter count from the outline or its format', () => {
    expect(suggestedChapters(book({ chapters: 24 }))).toBe(24);
    expect(suggestedChapters(book({ format: 'novella' }))).toBe(12);
    expect(suggestedChapters(book())).toBe(30);
  });

  it('places every beat in the chapter where it lands', () => {
    const placed = beatsByChapter(book(), 4);
    expect(placed.flat()).toHaveLength(8);
    expect(placed[0]).toEqual(['setup', 'inciting', 'plot-point-1']);
    expect(placed[3]).toEqual(['climax', 'resolution']);
  });

  it('sends an outline to the Desk as ordered chapters', () => {
    sendToDesk('u1', book(), 3);
    const calls = vi.mocked(createEntry).mock.calls.map(([, input]) => input);
    expect(calls.map((c) => c.title)).toEqual(['Chapter 1', 'Chapter 2', 'Chapter 3']);
    expect(calls.every((c) => c.type === 'chapter' && c.parentId === 'b1')).toBe(true);
    const orders = calls.map((c) => c.order!);
    expect([...orders].sort()).toEqual(orders);
    expect(new Set(orders).size).toBe(3);
    expect(updateEntry).toHaveBeenCalledWith('u1', 'b1', {}, { onDesk: true });
  });

  it('moves a chapter by swapping places with its neighbor', () => {
    const a = fakeShard('', { id: 'a', type: 'chapter', parentId: 'b1', order: '1' });
    const b = fakeShard('', { id: 'b', type: 'chapter', parentId: 'b1', order: '2' });
    const other = fakeShard('', { id: 'x', type: 'chapter', parentId: 'b2', order: '0' });
    expect(childrenOf([b, other, a], 'b1').map((c) => c.id)).toEqual(['a', 'b']);
    move('u1', [a, b], 'b', -1);
    expect(updateEntry).toHaveBeenCalledWith('u1', 'b', { order: '1' });
    expect(updateEntry).toHaveBeenCalledWith('u1', 'a', { order: '2' });
    vi.mocked(updateEntry).mockClear();
    move('u1', [a, b], 'a', -1);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it('lists a manuscript’s scenes in reading order', () => {
    const ch = (id: string, order: string, parentId = 'b1') =>
      fakeShard('', { id, type: 'chapter', parentId, order });
    const sc = (id: string, parentId: string, order: string) =>
      fakeShard('', { id, type: 'scene', parentId, order });
    const chapters = [ch('c2', '2'), ch('c1', '1'), ch('cx', '0', 'b2')];
    const scenes = [
      sc('s3', 'c2', '1'),
      sc('s2', 'c1', '2'),
      sc('s1', 'c1', '1'),
      sc('sx', 'cx', '1'),
    ];
    expect(
      manuscriptScenes(chapters, scenes, 'b1').map((r) => [r.scene.id, r.chapterNumber]),
    ).toEqual([
      ['s1', 1],
      ['s2', 1],
      ['s3', 2],
    ]);
  });

  it('finds the scenes a character appears in, as POV or by mention', () => {
    const book = fakeShard('', { id: 'b1', type: 'book', title: 'Salt', fields: { onDesk: true } });
    const ch = (id: string, order: string) =>
      fakeShard('', { id, type: 'chapter', parentId: 'b1', order });
    const sc = (id: string, parentId: string, fields = {}) =>
      fakeShard('', { id, type: 'scene', parentId, order: '1', fields });
    const scenes = [
      sc('s2', 'c2'),
      sc('s1', 'c1', { pov: 'mira' }),
      sc('s3', 'c2', { pov: 'tam' }),
    ];
    const mention = (fromId: string, toId: string) => ({
      id: `${fromId}__mention__${toId}`,
      workspaceId: 'u1',
      fromId,
      toId,
      kind: 'mention' as const,
    });
    const rows = appearances(
      'mira',
      scenes,
      [ch('c2', '2'), ch('c1', '1')],
      [book],
      [mention('s2', 'mira'), mention('s3', 'tam')],
    );
    expect(rows.map((r) => [r.scene.id, r.pov, r.chapterNumber])).toEqual([
      ['s1', true, 1],
      ['s2', false, 2],
    ]);
  });
});
