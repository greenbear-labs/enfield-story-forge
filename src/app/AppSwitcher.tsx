import { Link } from '@tanstack/react-router';
import { Icon } from '../components/ui/Icon';
import { Menu } from '../components/ui/Menu';

export type EnfieldApp = 'forge' | 'world' | 'paths';

const APPS = {
  forge: { name: 'Story Forge', sec: 'home', blurb: 'From shards to a finished manuscript' },
  world: { name: 'World Creator', sec: 'world', blurb: 'Indexes of places, peoples, and anything' },
  paths: { name: 'Shadow Paths', sec: 'paths', blurb: 'Build and play choose-your-own adventures' },
} as const;

const APP_HOME = { forge: '/hub', world: '/world', paths: '/paths' } as const;
const APP_ICON = { forge: 'desk', world: 'world', paths: 'paths' } as const;

export function Wordmark({
  tagline = 'Enfield · switch app ⇄',
  app = 'forge',
}: {
  tagline?: string;
  app?: EnfieldApp;
}) {
  return (
    <>
      <span
        data-sec={APPS[app].sec}
        className="grid size-7 flex-none place-items-center rounded-[7px] bg-accent font-display font-semibold text-on-accent"
      >
        E
      </span>
      <span className="font-display text-[1.02rem] leading-[1.1] font-semibold">
        {APPS[app].name}
        <small className="block font-ui text-[0.66rem] font-medium tracking-[0.08em] text-muted uppercase max-sm:hidden">
          {tagline}
        </small>
      </span>
    </>
  );
}

/** The Enfield app family: Story Forge, World Creator, and Shadow Paths share one account and one library. */
export function AppSwitcher({ current }: { current: EnfieldApp }) {
  return (
    <Menu
      label="Enfield apps"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`${APPS[current].name}. Switch app`}
          className="flex items-center gap-2 rounded-md border-0 bg-transparent px-1.5 py-1 text-left hover:bg-sunken"
        >
          <Wordmark app={current} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="label px-2 pt-1 pb-1.5">Enfield apps</div>
          {(['forge', 'world', 'paths'] as const).map((app) => (
            <Link
              key={app}
              to={APP_HOME[app]}
              role="menuitem"
              className="menu-item"
              onClick={close}
            >
              <span data-sec={APPS[app].sec} className="text-accent">
                <Icon name={APP_ICON[app]} />
              </span>
              <span className="flex-1">
                <b className="block">{APPS[app].name}</b>
                <span className="text-[0.8rem] text-muted">{APPS[app].blurb}</span>
              </span>
              {app === current && <Icon name="check" className="text-brand" />}
            </Link>
          ))}
        </>
      )}
    </Menu>
  );
}
