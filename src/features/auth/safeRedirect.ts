/**
 * Only follow redirects that stay inside the app. The value is resolved the way the
 * browser would (so `/\evil.example` counts as another origin) and reduced to a path.
 */
export function safeRedirect(
  redirect: string | undefined,
  origin = window.location.origin,
): string {
  if (!redirect?.startsWith('/')) return '/hub';
  try {
    const url = new URL(redirect, origin);
    return url.origin === origin ? url.pathname + url.search + url.hash : '/hub';
  } catch {
    return '/hub';
  }
}
