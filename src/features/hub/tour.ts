import type { IconName } from '../../components/ui/Icon';
import type { Entry, Section } from '../../data/types';

export interface TourStep {
  key: string;
  sec: Section;
  icon: IconName;
  title: string;
  body: string;
  done: (entries: Entry[]) => boolean;
}

const has = (type: Entry['type']) => (entries: Entry[]) => entries.some((e) => e.type === type);

/** The first-time walkthrough: one small thing to try at each station. */
export const TOUR: TourStep[] = [
  {
    key: 'shard',
    sec: 'shard',
    icon: 'shard',
    title: 'Save a story shard',
    body: 'A shard is any scrap that might become a story: a place, a person, a line of dialogue. Type one into Quick shard below, or open Story Shards.',
    done: has('shard'),
  },
  {
    key: 'concept',
    sec: 'concept',
    icon: 'concept',
    title: 'Grow a concept',
    body: 'A concept is a story you could pitch in one sentence. Roll one with the Concept Generator, or build one from your shards.',
    done: has('concept'),
  },
  {
    key: 'char',
    sec: 'char',
    icon: 'char',
    title: 'Meet your cast',
    body: 'A Quick Card takes under a minute: a name, a role, what they want and what they need.',
    done: has('character'),
  },
  {
    key: 'outline',
    sec: 'story',
    icon: 'outline',
    title: 'Outline a story',
    body: 'Pick a structure, like the Hero’s Journey or Save the Cat, and fill in the beats as far as you like.',
    done: has('book'),
  },
  {
    key: 'desk',
    sec: 'desk',
    icon: 'desk',
    title: 'Write a scene',
    body: 'Send your outline to the Writer’s Desk, open a scene, and write. Everything saves as you type, even offline.',
    done: (entries) => entries.some((e) => e.type === 'scene' && (e.wordCount ?? 0) > 0),
  },
];

export const tourDone = (entries: Entry[]) => TOUR.filter((s) => s.done(entries)).length;
