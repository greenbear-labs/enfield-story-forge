import type { EnfieldApp } from './AppSwitcher';

/**
 * Each Enfield app has its own web address, so it feels like its own program:
 * the first part of the host name says which app it is. Any other host (the
 * original enfield.greenbearlabs.com, previews, localhost) is Story Forge, and
 * there every app still works under its own path (/hub, /world, /paths).
 */
export const APP_SUBDOMAIN: Record<Exclude<EnfieldApp, 'forge'>, string> = {
  world: 'worlds',
  paths: 'shadowpaths',
};
const FORGE_SUBDOMAIN = 'enfield';

/** Which app a host name belongs to. */
export function appForHost(hostname: string): EnfieldApp {
  const first = hostname.split('.')[0];
  if (first === APP_SUBDOMAIN.world) return 'world';
  if (first === APP_SUBDOMAIN.paths) return 'paths';
  return 'forge';
}

/**
 * The host of another app, next to this one: worlds.greenbearlabs.com →
 * shadowpaths.greenbearlabs.com. Undefined on hosts that aren't named for an
 * app (previews, localhost), where every app lives under its own path instead.
 */
export function hostForApp(app: EnfieldApp, hostname: string): string | undefined {
  const [first = '', ...rest] = hostname.split('.');
  const known = [FORGE_SUBDOMAIN, ...Object.values(APP_SUBDOMAIN)];
  if (!known.includes(first) || rest.length === 0) return undefined;
  return [app === 'forge' ? FORGE_SUBDOMAIN : APP_SUBDOMAIN[app], ...rest].join('.');
}

/** The app this page was opened as. */
export const hostApp: EnfieldApp =
  typeof window === 'undefined' ? 'forge' : appForHost(window.location.hostname);

/** Each app's front door and sign-in, when it isn't the app this address is for. */
const LANDING = { forge: '/', world: '/world-creator', paths: '/shadow-paths' } as const;
const SIGN_IN = {
  forge: '/sign-in',
  world: '/world-creator/sign-in',
  paths: '/shadow-paths/sign-in',
} as const;

/** Where to find an app's landing page from here: `/` on its own address. */
export function landingHref(app: EnfieldApp, current = hostApp): string {
  if (app === current) return '/';
  return (typeof window === 'undefined' ? undefined : elsewhere(app, '/')) ?? LANDING[app];
}

/** An app's sign-in page: `/sign-in` on its own address. */
export const signInPath = (app: EnfieldApp, current = hostApp) =>
  app === current ? '/sign-in' : SIGN_IN[app];

/**
 * When this address belongs to another app, the full URL to open `path` at
 * that app's own address (worlds.greenbearlabs.com/hub → enfield…/hub).
 * Undefined when the page can stay here.
 */
export function elsewhere(
  app: EnfieldApp,
  path: string,
  location: Pick<Location, 'hostname' | 'protocol' | 'port'> = window.location,
): string | undefined {
  const current = appForHost(location.hostname);
  // Story Forge's address still opens every app under its path.
  if (current === 'forge' || current === app) return undefined;
  const host = hostForApp(app, location.hostname);
  if (!host) return undefined;
  return `${location.protocol}//${host}${location.port ? `:${location.port}` : ''}${path}`;
}
