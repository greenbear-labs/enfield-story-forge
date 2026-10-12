import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { draftLogline, randomSide, rowsFromConcept } from './mashup';

const concept = (fields: Record<string, unknown>) =>
  fakeShard('', { type: 'concept', title: 'C', fields: fields as never });

describe('the Mashup', () => {
  it('reads Generator parts, deriving the conflict from the enemy and clock', () => {
    const rows = rowsFromConcept(
      concept({
        logline: 'L',
        genre: 'Fantasy',
        parts: {
          hero: 'exiled knight',
          enemy: 'the Queen of Ash',
          clock: 'before dawn',
          twist: 'But.',
        },
      }),
    );
    expect(rows).toMatchObject({
      hero: 'exiled knight',
      conflict: 'to defeat the Queen of Ash before dawn',
      tone: 'Fantasy',
      hook: 'But.',
    });
  });

  it('uses the logline as the hook for a concept without parts', () => {
    expect(rowsFromConcept(concept({ logline: 'A diver hears bells.' })).hook).toBe(
      'A diver hears bells.',
    );
  });

  it('drafts a logline from the chosen rows', () => {
    expect(
      draftLogline({
        hero: 'exiled knight',
        goal: 'must return a stolen crown',
        world: 'a drowned empire',
        conflict: 'to defeat the Queen of Ash',
        tone: 'dark',
        hook: 'But the hero caused it all.',
      }),
    ).toBe(
      'An exiled knight must return a stolen crown in a drowned empire, to defeat the Queen of Ash. But the hero caused it all.',
    );
    expect(draftLogline({ hero: '', goal: '', world: '', conflict: '', tone: '', hook: '' })).toBe(
      'Someone.',
    );
  });

  it('makes a complete random premise', () => {
    const side = randomSide();
    for (const v of Object.values(side.values)) expect(v).toBeTruthy();
    expect(side.id).toBeUndefined();
  });
});
