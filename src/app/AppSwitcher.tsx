import { Icon } from '../components/ui/Icon';
import { Menu } from '../components/ui/Menu';

export function Wordmark({ tagline = 'Enfield · switch app ⇄' }: { tagline?: string }) {
  return (
    <>
      <span className="grid size-7 flex-none place-items-center rounded-[7px] bg-brand font-display font-semibold text-on-accent">
        E
      </span>
      <span className="font-display text-[1.02rem] leading-[1.1] font-semibold">
        Story Forge
        <small className="block font-ui text-[0.66rem] font-medium tracking-[0.08em] text-muted uppercase max-sm:hidden">
          {tagline}
        </small>
      </span>
    </>
  );
}

/** The Enfield app family. Only Story Forge exists so far. */
export function AppSwitcher() {
  return (
    <Menu
      label="Enfield apps"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label="Story Forge. Switch app"
          className="flex items-center gap-2 rounded-md border-0 bg-transparent px-1.5 py-1 text-left hover:bg-sunken"
        >
          <Wordmark />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="label px-2 pt-1 pb-1.5">Enfield apps</div>
          <button type="button" role="menuitem" className="menu-item" onClick={close}>
            <span data-sec="home" className="text-accent">
              <Icon name="desk" />
            </span>
            <span className="flex-1">
              <b className="block">Story Forge</b>
              <span className="text-[0.8rem] text-muted">From shards to a finished manuscript</span>
            </span>
            <Icon name="check" className="text-brand" />
          </button>
          <button type="button" role="menuitem" className="menu-item" disabled>
            <span data-sec="world" className="text-accent">
              <Icon name="world" />
            </span>
            <span className="flex-1">
              <b className="block">World Creator</b>
              <span className="text-[0.8rem]">Coming soon</span>
            </span>
          </button>
        </>
      )}
    </Menu>
  );
}
