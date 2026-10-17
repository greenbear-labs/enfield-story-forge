import { useEffect } from 'react';
import type { EnfieldApp } from './AppSwitcher';

export const APP_TITLE: Record<EnfieldApp, string> = {
  forge: 'Enfield Story Forge',
  world: 'Enfield World Creator',
  paths: 'Enfield Shadow Paths',
};
const SHORT: Record<EnfieldApp, string> = {
  forge: 'Story Forge',
  world: 'World Creator',
  paths: 'Shadow Paths',
};

/** Each app carries its own name in the browser tab. */
export function useAppTitle(app: EnfieldApp, page?: string) {
  useEffect(() => {
    const before = document.title;
    document.title = page ? `${page} · ${SHORT[app]}` : APP_TITLE[app];
    return () => {
      document.title = before;
    };
  }, [app, page]);
}
