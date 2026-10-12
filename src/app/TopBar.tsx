import { Icon } from '../components/ui/Icon';
import { openCapture } from '../features/shards/captureStore';
import { AccountMenu } from './AccountMenu';
import { AppSwitcher } from './AppSwitcher';
import { SearchButton } from './SearchButton';
import { StationNav } from './StationNav';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

export function TopBar() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-2 max-sm:gap-1.5 max-sm:px-4">
        <AppSwitcher current="forge" />
        <SearchButton />
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
    </header>
  );
}
