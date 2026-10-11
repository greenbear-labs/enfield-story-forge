import type { IconName } from '../components/ui/Icon';
import type { Section } from '../data/types';

export type StationPath =
  '/hub' | '/shards' | '/concepts' | '/outlines' | '/desk' | '/characters' | '/appendix';

export interface NavItem {
  to: StationPath;
  label: string;
  sec: Section;
  icon: IconName;
  /** Journey number (1 to 4); shown instead of the icon. */
  num?: number;
}

/** The workflow: Hub, then the four numbered stations. */
export const JOURNEY_NAV: NavItem[] = [
  { to: '/hub', label: 'Hub', sec: 'home', icon: 'home' },
  { to: '/shards', label: 'Story Shards', sec: 'shard', icon: 'shard', num: 1 },
  { to: '/concepts', label: 'Concepts', sec: 'concept', icon: 'concept', num: 2 },
  { to: '/outlines', label: 'Outline Builder', sec: 'story', icon: 'outline', num: 3 },
  { to: '/desk', label: 'Writer’s Desk', sec: 'desk', icon: 'desk', num: 4 },
];

export const CHARACTER_NAV: NavItem = {
  to: '/characters',
  label: 'Character Center',
  sec: 'char',
  icon: 'char',
};

export const APPENDIX_NAV: NavItem = {
  to: '/appendix',
  label: 'Appendix',
  sec: 'learn',
  icon: 'info',
};

export const WORLD_CREATOR_SOON =
  'Enfield World Creator is its own app. It arrives in a later phase.';
