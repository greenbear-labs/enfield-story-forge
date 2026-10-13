import { Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';
import { Loading } from '../components/ui/Loading';
import { AccountMenu } from './AccountMenu';
import { AppSwitcher } from './AppSwitcher';
import { SearchButton } from './SearchButton';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

/**
 * Enfield Shadow Paths' own layout: its own name and a dusk-indigo look, with
 * the app switcher to go back to Story Forge. Same account, same library.
 */
export function PathsShell() {
  return (
    <div data-sec="paths" className="paths-app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-20 border-b-2 border-accent bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-2 max-sm:gap-1.5 max-sm:px-4">
          <AppSwitcher current="paths" />
          <SearchButton />
          <SyncIndicator />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex max-w-[1180px] flex-col gap-[22px] px-5 pt-[22px] pb-20 max-sm:px-4 max-sm:pt-4"
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
