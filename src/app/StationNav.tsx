import { Link } from '@tanstack/react-router';
import { Icon } from '../components/ui/Icon';
import { APPENDIX_NAV, CHARACTER_NAV, JOURNEY_NAV, type NavItem } from './navigation';

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link to={item.to} data-sec={item.sec} className="st">
      {item.num ? <span className="n">{item.num}</span> : <Icon name={item.icon} />}
      <span>{item.label}</span>
    </Link>
  );
}

/** The station bar. Scrolls sideways on phones. */
export function StationNav() {
  return (
    <nav className="station-nav" aria-label="Workshops">
      {JOURNEY_NAV.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
      <span className="mx-1.5 my-2.5 w-px flex-none bg-line" aria-hidden="true" />
      <NavLink item={CHARACTER_NAV} />
      <Link to="/world" className="st" data-sec="world">
        <Icon name="world" />
        <span>World Creator ↗</span>
      </Link>
      <Link to="/paths" className="st" data-sec="paths">
        <Icon name="paths" />
        <span>Shadow Paths ↗</span>
      </Link>
      <NavLink item={APPENDIX_NAV} />
    </nav>
  );
}
