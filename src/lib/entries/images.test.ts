import { describe, expect, it } from 'vitest';
import type { Entry, EntryImage } from '../../data/types';
import { coverOf, fitWithin, imagesOf, isCover, MAX_IMAGE_SIDE } from './images';

const image = (id: string): EntryImage => ({ id, storagePath: `workspaces/w/images/e/${id}.webp` });
const entry = (images: EntryImage[] | undefined, coverImageId?: string) =>
  ({ id: 'e', images, coverImageId }) as unknown as Entry;

describe('fitWithin', () => {
  it('leaves small images alone', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest side down to the limit, keeping the shape', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_IMAGE_SIDE, height: 1200 });
    expect(fitWithin(1000, 5000, 1000)).toEqual({ width: 200, height: 1000 });
  });

  it('never goes below one pixel', () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('covers', () => {
  it('uses the first image until another is picked', () => {
    const e = entry([image('a'), image('b')]);
    expect(coverOf(e)?.id).toBe('a');
    expect(isCover(e, image('b'))).toBe(false);
  });

  it('uses the picked cover', () => {
    expect(coverOf(entry([image('a'), image('b')], 'b'))?.id).toBe('b');
  });

  it('falls back to the first if the picked cover was removed', () => {
    expect(coverOf(entry([image('a')], 'gone'))?.id).toBe('a');
  });

  it('copes with entries saved before images existed', () => {
    expect(imagesOf(entry(undefined))).toEqual([]);
    expect(coverOf(entry(undefined))).toBeUndefined();
  });
});
