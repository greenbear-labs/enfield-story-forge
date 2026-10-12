import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntry, updateEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import { beatsByChapter, childrenOf, move, sendToDesk, suggestedChapters } from './deskModel';

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
});
