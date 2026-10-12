import { useEffect, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { SearchDialog } from '../features/search/SearchDialog';
import { openCapture } from '../features/shards/captureStore';
import { AccountMenu } from './AccountMenu';
import { AppSwitcher } from './AppSwitcher';
import { StationNav } from './StationNav';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K (or Cmd+K) opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-2 max-sm:gap-1.5 max-sm:px-4">
        <AppSwitcher />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="ml-auto flex max-w-[380px] flex-1 items-center gap-2 rounded-md border border-line bg-bg px-2.5 py-1.5 text-muted max-sm:flex-none"
        >
          <Icon name="search" />
          <span className="max-sm:hidden">Search everything</span>
          <kbd className="ml-auto rounded border border-line px-1.5 font-mono text-[0.7rem] max-sm:hidden">
            Ctrl K
          </kbd>
        </button>
        <button
          type="button"
          data-sec="shard"
          onClick={() => openCapture()}
          className="btn btn-small border-accent text-accent"
          aria-label="New shard"
        >
          <Icon name="plus" size={16} />
          <span className="max-sm:hidden">Shard</span>
        </button>
        <SyncIndicator />
        <ThemeToggle />
        <AccountMenu />
      </div>
      <StationNav />
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
