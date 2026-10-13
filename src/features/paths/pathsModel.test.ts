import { describe, expect, it } from 'vitest';
import { adventureBlurb, adventureCategories, toggleCategory } from './pathsModel';

describe('adventureCategories', () => {
  it('keeps known categories in library order', () => {
    expect(adventureCategories({ fields: { categories: ['Horror', 'Nope', 'Fantasy'] } })).toEqual([
      'Fantasy',
      'Horror',
    ]);
  });

  it('is empty when the field is missing or not a list', () => {
    expect(adventureCategories({ fields: {} })).toEqual([]);
    expect(adventureCategories({ fields: { categories: 'Horror' } })).toEqual([]);
  });
});

describe('toggleCategory', () => {
  it('adds a category in library order', () => {
    expect(toggleCategory(['Horror'], 'Adventure')).toEqual(['Adventure', 'Horror']);
  });

  it('removes a category that is already there', () => {
    expect(toggleCategory(['Adventure', 'Horror'], 'Horror')).toEqual(['Adventure']);
  });
});

describe('adventureBlurb', () => {
  it('reads the blurb, or nothing', () => {
    expect(adventureBlurb({ fields: { blurb: 'Lost in the Ashwood.' } })).toBe(
      'Lost in the Ashwood.',
    );
    expect(adventureBlurb({ fields: {} })).toBe('');
  });
});
