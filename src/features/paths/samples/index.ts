import { bookThatReads } from './bookThatReads';
import { fogGlade } from './fogGlade';
import { lanternKeeper } from './lanternKeeper';
import type { SampleStory } from './types';

export type { SampleStory } from './types';

/** The sample stories, in the order they're offered. */
export const SAMPLE_STORIES: SampleStory[] = [lanternKeeper, bookThatReads, fogGlade];
