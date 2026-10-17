import { describe, expect, it } from 'vitest';
import { appForHost, elsewhere, hostForApp, landingHref, signInPath } from './hosts';

const at = (hostname: string, port = '') => ({ hostname, protocol: 'https:', port });

describe('appForHost', () => {
  it('reads the app from the first part of the address', () => {
    expect(appForHost('worlds.greenbearlabs.com')).toBe('world');
    expect(appForHost('shadowpaths.greenbearlabs.com')).toBe('paths');
    expect(appForHost('enfield.greenbearlabs.com')).toBe('forge');
  });
  it('treats any other address as Story Forge', () => {
    expect(appForHost('localhost')).toBe('forge');
    expect(appForHost('enfield-story-forge-git-x.vercel.app')).toBe('forge');
  });
});

describe('hostForApp', () => {
  it('swaps the first part of an app address', () => {
    expect(hostForApp('paths', 'worlds.greenbearlabs.com')).toBe('shadowpaths.greenbearlabs.com');
    expect(hostForApp('forge', 'shadowpaths.greenbearlabs.com')).toBe('enfield.greenbearlabs.com');
  });
  it('has nothing for addresses that are not named for an app', () => {
    expect(hostForApp('world', 'my-preview.vercel.app')).toBeUndefined();
    expect(hostForApp('world', 'localhost')).toBeUndefined();
  });
});

describe('elsewhere', () => {
  it('sends another app’s pages to that app’s own address', () => {
    expect(elsewhere('forge', '/hub?x=1', at('worlds.greenbearlabs.com'))).toBe(
      'https://enfield.greenbearlabs.com/hub?x=1',
    );
    expect(elsewhere('world', '/world', at('shadowpaths.localhost', '4173'))).toBe(
      'https://worlds.localhost:4173/world',
    );
  });
  it('keeps every app on Story Forge’s address, and an app on its own', () => {
    expect(elsewhere('world', '/world', at('enfield.greenbearlabs.com'))).toBeUndefined();
    expect(elsewhere('paths', '/paths', at('localhost'))).toBeUndefined();
    expect(elsewhere('world', '/world', at('worlds.greenbearlabs.com'))).toBeUndefined();
  });
});

describe('landing and sign-in paths', () => {
  it('are at the root on the app’s own address, and under a path elsewhere', () => {
    expect(landingHref('world', 'world')).toBe('/');
    expect(landingHref('world', 'forge')).toBe('/world-creator');
    expect(signInPath('paths', 'paths')).toBe('/sign-in');
    expect(signInPath('paths', 'forge')).toBe('/shadow-paths/sign-in');
    expect(signInPath('forge', 'forge')).toBe('/sign-in');
  });
});
