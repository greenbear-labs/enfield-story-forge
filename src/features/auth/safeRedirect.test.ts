import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect';

const origin = 'https://enfieldstoryforge.greenbearlabs.com';

describe('safeRedirect', () => {
  it('keeps paths inside the app', () => {
    expect(safeRedirect('/stations/shards?tab=all#top', origin)).toBe(
      '/stations/shards?tab=all#top',
    );
  });

  it('falls back to the hub when there is no redirect', () => {
    expect(safeRedirect(undefined, origin)).toBe('/hub');
    expect(safeRedirect('', origin)).toBe('/hub');
  });

  it.each([
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    'https://evil.example',
    'javascript:alert(1)',
  ])('rejects %s', (redirect) => {
    expect(safeRedirect(redirect, origin)).toBe('/hub');
  });

  it('falls back to the given page', () => {
    expect(safeRedirect(undefined, origin, '/paths')).toBe('/paths');
    expect(safeRedirect('//evil.example/x', origin, '/paths')).toBe('/paths');
  });
});
