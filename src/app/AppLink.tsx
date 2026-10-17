import { Link } from '@tanstack/react-router';
import type { ComponentProps } from 'react';
import type { EnfieldApp } from './AppSwitcher';
import { elsewhere, landingHref } from './hosts';

/**
 * A link into one of the Enfield apps: its landing page, or `to` inside it.
 * When that app has its own address, this opens it there.
 */
export function AppLink({
  app,
  to,
  ...props
}: { app: EnfieldApp; to?: string } & Omit<ComponentProps<'a'>, 'href'>) {
  const away = to ? elsewhere(app, to) : undefined;
  const href = away ?? (to ? undefined : landingHref(app));
  if (href && /^https?:/.test(href)) return <a href={href} {...props} />;
  return <Link to={to ?? href} {...props} />;
}
