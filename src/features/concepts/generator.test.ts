import { describe, expect, it } from 'vitest';
import { fakeShard } from '../../test/entries';
import { filterConcepts } from './conceptModel';
import {
  conceptSentence,
  dealAll,
  fillPicks,
  isComplete,
  sample,
  VISIBLE_OPTIONS,
} from './generator';
import { GENERATOR_COLUMNS } from './generatorPools';

const full = {
  hero: 'exiled knight',
  goal: 'must return a stolen crown',
  world: 'a drowned empire',
  ally: 'a talking sword',
  enemy: 'the Queen of Ash',
  clock: 'before dawn',
};

describe('Concept Generator', () => {
  it('builds the sentence, with the right article and an optional twist', () => {
    expect(conceptSentence(full)).toBe(
      'An exiled knight must return a stolen crown in a drowned empire, and must team up with a talking sword to defeat the Queen of Ash before dawn.',
    );
    expect(
      conceptSentence({ ...full, hero: 'runaway prince', twist: 'But the hero caused it all.' }),
    ).toMatch(/^A runaway prince .* before dawn\. But the hero caused it all\.$/);
    expect(conceptSentence({})).toMatch(/^A … … in …/);
  });

  it('is complete without a twist, and not without a required column', () => {
    expect(isComplete(full)).toBe(true);
    expect(isComplete({ ...full, clock: undefined })).toBe(false);
  });

  it('deals distinct options and keeps a pick visible', () => {
    const pool = GENERATOR_COLUMNS[0].options;
    const keep = pool[pool.length - 1];
    const dealt = sample(pool, VISIBLE_OPTIONS, Math.random, keep);
    expect(dealt).toHaveLength(VISIBLE_OPTIONS);
    expect(new Set(dealt).size).toBe(VISIBLE_OPTIONS);
    expect(dealt).toContain(keep);
    expect(dealAll({ hero: keep }).hero).toContain(keep);
  });

  it('fills only the empty required columns', () => {
    const shown = dealAll();
    const picks = fillPicks(shown, { hero: 'exiled knight' });
    expect(picks.hero).toBe('exiled knight');
    expect(isComplete(picks)).toBe(true);
    expect(picks.twist).toBeUndefined();
    expect(shown.goal).toContain(picks.goal);
  });

  it('filters concepts by status and search', () => {
    const a = fakeShard('', {
      type: 'concept',
      title: 'Salt Key',
      status: 'ready',
      fields: { logline: 'A key' },
    });
    const b = fakeShard('', {
      type: 'concept',
      title: 'Night City',
      fields: { logline: 'A city' },
    });
    expect(filterConcepts([a, b], { query: '', status: 'spark' })).toEqual([b]);
    expect(filterConcepts([a, b], { query: 'key', status: null })).toEqual([a]);
  });
});
