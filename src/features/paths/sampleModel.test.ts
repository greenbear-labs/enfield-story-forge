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

/** The art in public/paths-art/, by its path on the site. */
const ART = new Set(
  Object.keys(import.meta.glob('/public/paths-art/**/*.webp')).map((f) =>
    f.slice('/public'.length),
  ),
);

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
    // A true ending to reach, and something else to find along the way.
    const endings = new Set(Object.values(sample.passages).map((p) => p.ending));
    expect(endings, `${key} has a true ending`).toContain('true');
    expect(endings.size, `${key} has more than one kind of ending`).toBeGreaterThan(2);
    // Every picture is built-in art that's really there.
    for (const art of [sample.cover, ...Object.values(sample.passages).map((p) => p.art)]) {
      if (!art) continue;
      expect(coverArtOf({ fields: { coverArt: art } }), art).toBe(art);
      expect(ART, art).toContain(art);
    }
  });

  it('the written samples have every kind of ending to hunt for', () => {
    for (const key of ['lantern-keeper', 'book-that-reads', 'fog-glade']) {
      const endings = new Set(Object.values(built(key).sample.passages).map((p) => p.ending));
      for (const type of ['true', 'secret', 'death', 'other'] as const)
        expect(endings, `${key} has a ${type} ending`).toContain(type);
    }
  });

  it('brings the Ashwood over as it was, with a picture on every passage', () => {
    const { sample, passages } = built('ashwood');
    expect(passages).toHaveLength(7);
    expect(Object.values(sample.passages).every((p) => p.art)).toBe(true);
    const start = passages.find((p) => p.id === 'start')!;
    expect(choicesOf(start).map((c) => [c.label, c.to])).toEqual([
      ['Approach the lantern', 'lantern'],
      ['Turn back to the road', 'safe'],
    ]);
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
    expect(coverArtOf({ fields: { coverArt: '/paths-art/ashwood/stag.webp' } })).toBe(
      '/paths-art/ashwood/stag.webp',
    );
    expect(coverArtOf({ fields: { coverArt: '/paths-art/../secret.webp' } })).toBeNull();
    expect(coverArtOf({ fields: { coverArt: '/paths-art/a/b/c.webp' } })).toBeNull();
    expect(coverArtOf({ fields: { coverArt: 'https://example.com/x.webp' } })).toBeNull();
    expect(coverArtOf({ fields: {} })).toBeNull();
  });
});
