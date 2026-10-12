import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { rerollRow, rollSpark, sparkValues, SPARK_ROWS } from './archetypePools';
import {
  CHARACTER_MODULES,
  characterSummary,
  fieldText,
  fieldsFromValues,
  filterCast,
  INTERVIEW_QUESTIONS,
} from './characterModel';

const character = (title: string, fields = {}) =>
  fakeShard('', { type: 'character', title, fields });

describe('character fields', () => {
  it('reads top-level and module fields by path', () => {
    const c = character('Mira', { want: 'to get home', arc: { lie: 'Nobody stays.' } });
    expect(fieldText(c, 'want')).toBe('to get home');
    expect(fieldText(c, 'arc.lie')).toBe('Nobody stays.');
    expect(fieldText(c, 'arc.truth')).toBe('');
    expect(fieldText(c, 'want.nope')).toBe('');
  });

  it('nests dotted paths and drops blanks', () => {
    expect(
      fieldsFromValues({
        role: ' Mentor ',
        'backstory.wound': 'A fire',
        'arc.lie': '  ',
        need: '',
      }),
    ).toEqual({ role: 'Mentor', backstory: { wound: 'A fire' } });
  });

  it('sends every interview answer to a card field or the interview module', () => {
    const cardPaths = new Set([
      'want',
      'need',
      'flaw',
      ...CHARACTER_MODULES.flatMap((m) => m.fields.map((f) => f.path)),
    ]);
    for (const q of INTERVIEW_QUESTIONS) {
      expect(cardPaths.has(q.path) || (q.path.startsWith('interview.') && !!q.label)).toBe(true);
    }
    expect(new Set(INTERVIEW_QUESTIONS.map((q) => q.path)).size).toBe(INTERVIEW_QUESTIONS.length);
  });

  it('summarizes filled fields with their labels, in card order', () => {
    const c = character('Mira', {
      flaw: 'Trusts no one',
      role: 'Protagonist',
      arc: { type: 'flat', lie: 'Nobody stays.' },
      interview: { fear: 'Deep water' },
    });
    expect(characterSummary(c)).toEqual([
      ['Role', 'Protagonist'],
      ['Flaw', 'Trusts no one'],
      ['The lie', 'Nobody stays.'],
      ['Most afraid of', 'Deep water'],
      ['Arc type', 'Flat'],
    ]);
  });

  it('sorts the cast by name and searches inside module fields', () => {
    const cast = [
      character('zed'),
      character('Ama', { backstory: { wound: 'the flood' } }),
      character('Bo'),
    ];
    expect(filterCast(cast, '').map((c) => c.title)).toEqual(['Ama', 'Bo', 'zed']);
    expect(filterCast(cast, 'flood').map((c) => c.title)).toEqual(['Ama']);
  });
});

describe('Archetype Spark', () => {
  it('rolls one option per row and re-rolls a row to something new', () => {
    const spark = rollSpark();
    for (const row of SPARK_ROWS) expect(row.options).toContain(spark[row.key]);
    for (let i = 0; i < 20; i++) {
      const next = rerollRow(spark, 'flaw');
      expect(next.flaw).not.toBe(spark.flaw);
      expect(next.want).toBe(spark.want);
    }
  });

  it('maps the spark onto card fields', () => {
    const values = sparkValues({ role: 'R', flaw: 'F', wound: 'W', want: 'X' });
    expect(fieldsFromValues(values)).toEqual({
      role: 'R',
      flaw: 'F',
      want: 'X',
      backstory: { wound: 'W' },
    });
  });
});
