import { describe, expect, it } from 'vitest';
import type { Link } from '../../data/types';
import { fakeShard } from '../../test/entries';
import { breakdown, longestGap, plotlinesByScene } from './plotlineModel';

const ch = (id: string, order: string) =>
  fakeShard('', { id, type: 'chapter', parentId: 'b1', order });
const sc = (id: string, parentId: string, order = '1') =>
  fakeShard('', { id, type: 'scene', parentId, order });
const pl = (id: string) => fakeShard('', { id, type: 'plotline', parentId: 'b1' });
const tag = (fromId: string, toId: string): Link => ({
  id: `${fromId}__plotline__${toId}`,
  workspaceId: 'u1',
  fromId,
  toId,
  kind: 'plotline',
});

describe('the Chapter Breakdown', () => {
  const chapters = [ch('c1', '1'), ch('c2', '2'), ch('c3', '3'), ch('c4', '4')];
  const scenes = [sc('s1', 'c1'), sc('s2', 'c1', '2'), sc('s3', 'c2'), sc('s4', 'c4')];
  const tags = plotlinesByScene([
    tag('s1', 'a'),
    tag('s2', 'b'),
    tag('s2', 'a'),
    tag('s4', 'a'),
    tag('s3', 'gone'),
    { ...tag('s3', 'b'), kind: 'source' },
  ]);

  it('puts each scene in the cell for its chapter and plotlines', () => {
    const rows = breakdown(chapters, scenes, [pl('a'), pl('b')], tags);
    const ids = rows.map((r) => r.cells.map((c) => c.map((s) => s.id)));
    expect(ids).toEqual([
      [['s1', 's2'], [], [], ['s4']],
      [['s2'], [], [], []],
      // A scene tagged only with a deleted plotline counts as untagged.
      [[], ['s3'], [], []],
    ]);
    expect(rows.map((r) => r.chapters)).toEqual([2, 1, 1]);
    expect(rows[2]!.plotline).toBeNull();
  });

  it('finds the longest quiet stretch between a plotline’s first and last scenes', () => {
    const [a, b] = breakdown(chapters, scenes, [pl('a'), pl('b')], tags);
    expect(longestGap(a!)).toBe(2);
    // A plotline that wraps up early isn't quiet afterwards.
    expect(longestGap(b!)).toBe(0);
  });
});
