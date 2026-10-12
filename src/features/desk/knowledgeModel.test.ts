import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { ironies, secretsOf, START, whenIndex } from './knowledgeModel';

describe('who knows what', () => {
  const chapters = ['c1', 'c2', 'c3'];

  it('reads secrets from the book in the order they were added, skipping junk', () => {
    const book = fakeShard('', {
      type: 'book',
      fields: {
        secrets: {
          b: { fact: 'The map is fake', order: 2, reader: 'c2', learns: { tom: 'c3', mira: '' } },
          a: { fact: 'Tom is the thief', order: 1, reader: START, learns: {} },
          junk: 'not a secret',
        },
      },
    });
    expect(secretsOf(book)).toEqual([
      { id: 'a', fact: 'Tom is the thief', order: 1, reader: START, learns: {} },
      { id: 'b', fact: 'The map is fake', order: 2, reader: 'c2', learns: { tom: 'c3' } },
    ]);
    expect(secretsOf(fakeShard('', { type: 'book' }))).toEqual([]);
  });

  it('places a when in the book', () => {
    expect(whenIndex(START, chapters)).toBe(0);
    expect(whenIndex('c2', chapters)).toBe(2);
    expect(whenIndex('', chapters)).toBe(Infinity);
    expect(whenIndex('deleted-chapter', chapters)).toBe(Infinity);
  });

  it('finds the characters the reader is ahead of', () => {
    const secret = {
      id: 'a',
      fact: 'Tom is the thief',
      order: 1,
      reader: 'c1',
      learns: { mira: 'c3', ana: START, ben: 'c1' },
    };
    expect(ironies(secret, ['mira', 'ana', 'ben', 'tom'], chapters)).toEqual([
      { characterId: 'mira', reader: 1, learns: 3 },
      { characterId: 'tom', reader: 1, learns: Infinity },
    ]);
    expect(ironies({ ...secret, reader: '' }, ['mira'], chapters)).toEqual([]);
  });
});
