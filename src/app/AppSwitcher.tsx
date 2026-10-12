import { Link } from '@tanstack/react-router';
import { Icon } from '../components/ui/Icon';
import { Menu } from '../components/ui/Menu';

export type EnfieldApp = 'forge' | 'world';

const APPS = {
  forge: { name: 'Story Forge', sec: 'home', blurb: 'From shards to a finished manuscript' },
  world: { name: 'World Creator', sec: 'world', blurb: 'Indexes of places, peoples, and anything' },
} as const;

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

/** The Enfield app family: Story Forge and World Creator share one account and one library. */
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
          {(['forge', 'world'] as const).map((app) => (
            <Link
              key={app}
              to={app === 'forge' ? '/hub' : '/world'}
              role="menuitem"
              className="menu-item"
              onClick={close}
            >
              <span data-sec={APPS[app].sec} className="text-accent">
                <Icon name={app === 'forge' ? 'desk' : 'world'} />
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
