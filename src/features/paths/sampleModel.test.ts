import { describe, expect, it } from 'vitest';
import { storyHealth } from './healthModel';
import { choicesOf, coverArtOf, startIdOf } from './pathsModel';
import {
  sampleAdventureFields,
  sampleKeyOf,
  sampleLayout,
  samplePassageFields,
  textDoc,
} from './sampleModel';
import { SAMPLE_STORIES } from './samples';
import { linesOf, storyVars } from './stateModel';

/** A sample as the entries it would become, with passage keys as ids. */
function built(key: string) {
  const sample = SAMPLE_STORIES.find((s) => s.key === key)!;
  const adventure = {
    fields: { ...sampleAdventureFields(sample), startId: sample.start },
  };
  const passages = Object.entries(sample.passages).map(([id, p]) => ({
    id,
    title: p.title,
    fields: {
      ...(p.ending ? { ending: p.ending } : {}),
      ...samplePassageFields(sample, id, (k) => k),
    },
  }));
  return { sample, adventure, passages };
}

describe('sample stories', () => {
  it.each(SAMPLE_STORIES.map((s) => s.key))('%s is healthy and complete', (key) => {
    const { sample, adventure, passages } = built(key);
    expect(storyHealth(adventure, passages).issues).toEqual([]);
    expect(startIdOf(adventure)).toBe(sample.start);
    expect(coverArtOf(adventure)).toBe(sample.cover);
    expect(sampleKeyOf(adventure)).toBe(key);
    // Every rule names one of the story's own things.
    const vars = new Set(storyVars(adventure).map((v) => v.id));
    for (const p of passages) {
      for (const c of choicesOf(p))
        for (const r of [...c.requires, ...c.effects]) expect(vars).toContain(r.var);
      for (const l of linesOf(p)) expect(vars).toContain(l.when?.var);
    }
    // Every ending type, so readers have something to hunt for.
    const endings = new Set(Object.values(sample.passages).map((p) => p.ending));
    for (const type of ['true', 'secret', 'death', 'other'] as const)
      expect(endings, `${key} has a ${type} ending`).toContain(type);
  });

  it('reads choices and rules back as written', () => {
    const { passages } = built('fog-glade');
    const bridge = passages.find((p) => p.id === 'bridge')!;
    const [give] = choicesOf(bridge);
    expect(give).toMatchObject({ label: 'Drop your silver coin into the hands', to: 'well' });
    expect(give!.requires).toEqual([{ id: 'r1', var: 'coin', op: 'has', value: 0, order: 0 }]);
    expect(give!.effects).toEqual([{ id: 'r1', var: 'coin', op: 'lose', value: 0, order: 0 }]);
  });

  it('lays passages out in columns by steps from the start, without overlaps', () => {
    for (const sample of SAMPLE_STORIES) {
      const pos = sampleLayout(sample);
      expect(pos[sample.start]).toEqual({ x: 0, y: 0 });
      const spots = Object.values(pos).map((p) => `${p.x},${p.y}`);
      expect(new Set(spots).size).toBe(spots.length);
    }
  });
});

describe('textDoc', () => {
  it('makes a paragraph for each line', () => {
    expect(textDoc(['One.', 'Two.'])).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'One.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Two.' }] },
      ],
    });
  });
});

describe('coverArtOf', () => {
  it('only takes built-in art', () => {
    expect(coverArtOf({ fields: { coverArt: '/paths-art/fog-glade.webp' } })).toBe(
      '/paths-art/fog-glade.webp',
    );
    expect(coverArtOf({ fields: { coverArt: 'https://example.com/x.webp' } })).toBeNull();
    expect(coverArtOf({ fields: {} })).toBeNull();
  });
});
