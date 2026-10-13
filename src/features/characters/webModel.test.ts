import { describe, expect, it } from 'vitest';
import type { Link } from '../../data/types';
import { fakeShard } from '../../test/entries';
import { characterSummary, statsOf } from './characterModel';
import { circleLayout, tieCounts, webOrder, webTies } from './webModel';

const character = (id: string, title: string, fields = {}) =>
  fakeShard('', { id, type: 'character', title, fields });
const related = (fromId: string, toId: string): Link => ({
  id: `${fromId}__related__${toId}`,
  workspaceId: 'ws',
  fromId,
  toId,
  kind: 'related',
});

describe('the Relationship Web', () => {
  const mira = character('m', 'Mira', {
    relations: { t: 'Her brother. Never forgave him.' },
    relationKinds: { t: 'family' },
  });
  const tomas = character('t', 'Tomas', { relations: { m: 'Still owes her.' } });
  const ada = character('a', 'Ada');
  const zed = character('z', 'Zed');

  it('draws one tie per pair, with both sides’ notes and the kind', () => {
    const ties = webTies(
      [mira, tomas, ada],
      [related('m', 't'), related('t', 'm'), related('a', 'm')],
    );
    expect(ties).toHaveLength(2);
    const [adaMira, miraTomas] = ties;
    expect(adaMira).toMatchObject({ a: ada, b: mira, aToB: true, bToA: false, kind: null });
    expect(miraTomas).toMatchObject({
      a: mira,
      b: tomas,
      aOnB: 'Her brother. Never forgave him.',
      bOnA: 'Still owes her.',
      aToB: true,
      bToA: true,
      kind: 'family',
    });
  });

  it('leaves out ties to characters who aren’t shown, and ignores bad kinds', () => {
    const odd = character('o', 'Odd', { relationKinds: { m: 'nemesis' } });
    const ties = webTies([mira, odd], [related('m', 'z'), related('o', 'm')]);
    expect(ties).toHaveLength(1);
    expect(ties[0]!.kind).toBeNull();
  });

  it('seats tied characters next to each other, most connected first', () => {
    const ties = webTies(
      [mira, tomas, ada, zed],
      [related('m', 't'), related('a', 'm'), related('t', 'z')],
    );
    expect(tieCounts(ties).get('m')).toBe(2);
    expect(webOrder([zed, ada, tomas, mira], ties).map((c) => c.title)) // Ada ends up last, which on a circle is right beside Mira.
      .toEqual(['Mira', 'Tomas', 'Zed', 'Ada']);
  });

  it('spreads characters around a circle, starting at the top', () => {
    const at = circleLayout(['a', 'b', 'c', 'd'], 400);
    expect(at.get('a')).toEqual({ x: 200, y: 56 });
    expect(at.get('b')).toEqual({ x: 344, y: 200 });
    expect(circleLayout(['solo'], 400).get('solo')).toEqual({ x: 200, y: 200 });
  });
});

describe('character stats', () => {
  it('lists stats in order and adds the filled ones to the summary', () => {
    const c = character('m', 'Mira', {
      stats: {
        s2: { name: 'Strength', value: '14', order: 1 },
        s1: { name: 'Age', value: '32', order: 0 },
        s3: { name: 'Height', value: '', order: 2 },
        bad: 'oops',
      },
    });
    expect(statsOf(c).map((s) => s.name)).toEqual(['Age', 'Strength', 'Height']);
    expect(characterSummary(c)).toEqual([
      ['Age', '32'],
      ['Strength', '14'],
    ]);
  });
});
