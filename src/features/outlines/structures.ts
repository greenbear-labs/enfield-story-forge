/**
 * The structure library, as data. Each beat has a target position (0 to 1,
 * how far through the story it usually lands), so beats from different
 * structures line up and a story's notes can be read against any of them.
 */
export interface Beat {
  key: string;
  name: string;
  /** How far through the story, 0 to 1. */
  position: number;
  /** The question this beat asks of your story. */
  prompt: string;
  /** The act or part it belongs to, for grouping. */
  part: string;
}

export interface Structure {
  key: string;
  name: string;
  /** Who it comes from. */
  origin: string;
  bestFor: string;
  beats: Beat[];
}

const beat = (key: string, name: string, position: number, part: string, prompt: string): Beat => ({
  key,
  name,
  position,
  part,
  prompt,
});

export const STRUCTURES: Structure[] = [
  {
    key: 'monomyth',
    name: 'The Hero’s Journey (Monomyth)',
    origin: 'Joseph Campbell',
    bestFor: 'Epic, fantasy, and mythic journeys',
    beats: [
      beat(
        'call',
        'The Call to Adventure',
        0.04,
        'Departure',
        'What disrupts your hero’s ordinary world and invites them out of it?',
      ),
      beat(
        'refusal',
        'Refusal of the Call',
        0.08,
        'Departure',
        'Why do they say no at first? What fear or duty holds them back?',
      ),
      beat(
        'aid',
        'Supernatural Aid',
        0.12,
        'Departure',
        'Who or what helps them commit: a mentor, a gift, a sign?',
      ),
      beat(
        'threshold',
        'Crossing the First Threshold',
        0.18,
        'Departure',
        'What is the point of no return into the unknown world?',
      ),
      beat(
        'belly',
        'Belly of the Whale',
        0.23,
        'Departure',
        'Where are they swallowed up, cut off from the old self?',
      ),
      beat(
        'trials',
        'The Road of Trials',
        0.3,
        'Initiation',
        'What tests do they face, and which do they fail?',
      ),
      beat(
        'goddess',
        'Meeting with the Goddess',
        0.38,
        'Initiation',
        'What love, beauty, or unconditional support do they find?',
      ),
      beat(
        'temptation',
        'Temptation',
        0.44,
        'Initiation',
        'What could lure them away from the quest?',
      ),
      beat(
        'atonement',
        'Atonement with the Father',
        0.5,
        'Initiation',
        'Who or what holds ultimate power over them, and how do they face it?',
      ),
      beat(
        'apotheosis',
        'Apotheosis',
        0.56,
        'Initiation',
        'What do they come to understand that changes them?',
      ),
      beat(
        'boon',
        'The Ultimate Boon',
        0.62,
        'Initiation',
        'What do they gain: the prize, the knowledge, the cure?',
      ),
      beat(
        'refusal-return',
        'Refusal of the Return',
        0.68,
        'Return',
        'Why don’t they want to go back?',
      ),
      beat(
        'flight',
        'The Magic Flight',
        0.74,
        'Return',
        'How do they escape with the boon, and who chases them?',
      ),
      beat(
        'rescue',
        'Rescue from Without',
        0.8,
        'Return',
        'Who comes to save them when they can’t save themselves?',
      ),
      beat(
        'return-threshold',
        'Crossing the Return Threshold',
        0.87,
        'Return',
        'What is it like to bring the change back to the ordinary world?',
      ),
      beat(
        'master',
        'Master of the Two Worlds',
        0.93,
        'Return',
        'How do they now belong to both worlds?',
      ),
      beat(
        'freedom',
        'Freedom to Live',
        0.98,
        'Return',
        'What does life look like, free of the fear that held them?',
      ),
    ],
  },
  {
    key: 'vogler',
    name: 'The Writer’s Journey',
    origin: 'Christopher Vogler',
    bestFor: 'Screen-friendly adventure',
    beats: [
      beat(
        'ordinary',
        'The Ordinary World',
        0.03,
        'Act One',
        'Who is your hero before the story starts, and what’s missing?',
      ),
      beat('call', 'The Call to Adventure', 0.08, 'Act One', 'What problem or challenge appears?'),
      beat('refusal', 'Refusal of the Call', 0.12, 'Act One', 'What makes them hesitate?'),
      beat(
        'mentor',
        'Meeting the Mentor',
        0.17,
        'Act One',
        'Who gives them advice, training, or courage?',
      ),
      beat(
        'threshold',
        'Crossing the Threshold',
        0.24,
        'Act One',
        'What commits them to the adventure?',
      ),
      beat(
        'tests',
        'Tests, Allies, Enemies',
        0.35,
        'Act Two',
        'Who do they meet, and how do they learn the new rules?',
      ),
      beat(
        'approach',
        'Approach to the Inmost Cave',
        0.45,
        'Act Two',
        'How do they prepare for the biggest danger yet?',
      ),
      beat('ordeal', 'The Ordeal', 0.52, 'Act Two', 'What life-or-death crisis do they face?'),
      beat('reward', 'Reward', 0.62, 'Act Two', 'What do they take from surviving it?'),
      beat(
        'road-back',
        'The Road Back',
        0.75,
        'Act Three',
        'What pulls them back toward home, and what chases them?',
      ),
      beat(
        'resurrection',
        'Resurrection',
        0.88,
        'Act Three',
        'What final test proves they’ve changed?',
      ),
      beat(
        'elixir',
        'Return with the Elixir',
        0.97,
        'Act Three',
        'What do they bring home that helps everyone?',
      ),
    ],
  },
  {
    key: 'three-act',
    name: 'Three-Act Structure',
    origin: 'Aristotle, Syd Field',
    bestFor: 'Everything; the universal baseline',
    beats: [
      beat(
        'setup',
        'Setup',
        0.05,
        'Act One',
        'Who, where, and what’s normal? What does your hero want?',
      ),
      beat(
        'inciting',
        'Inciting Incident',
        0.12,
        'Act One',
        'What event kicks the story into motion?',
      ),
      beat(
        'plot-point-1',
        'Plot Point One',
        0.25,
        'Act One',
        'What decision locks your hero into the main conflict?',
      ),
      beat('rising', 'Rising Action', 0.37, 'Act Two', 'How do the obstacles get harder?'),
      beat(
        'midpoint',
        'Midpoint',
        0.5,
        'Act Two',
        'What reversal or revelation changes the stakes?',
      ),
      beat(
        'plot-point-2',
        'Plot Point Two',
        0.75,
        'Act Two',
        'What is the lowest point, and what new piece lets them try again?',
      ),
      beat(
        'climax',
        'Climax',
        0.88,
        'Act Three',
        'What is the final confrontation, and what choice decides it?',
      ),
      beat('resolution', 'Resolution', 0.97, 'Act Three', 'What’s the new normal?'),
    ],
  },
  {
    key: 'save-the-cat',
    name: 'Save the Cat',
    origin: 'Blake Snyder (Jessica Brody for novels)',
    bestFor: 'Commercial fiction and film',
    beats: [
      beat(
        'opening',
        'Opening Image',
        0.01,
        'Act One',
        'What snapshot shows your hero’s world and flaw before the change?',
      ),
      beat(
        'theme',
        'Theme Stated',
        0.05,
        'Act One',
        'Who hints at the lesson your hero needs to learn?',
      ),
      beat(
        'setup',
        'Setup',
        0.08,
        'Act One',
        'What’s broken in their life that they don’t see yet?',
      ),
      beat('catalyst', 'Catalyst', 0.1, 'Act One', 'What life-changing event happens to them?'),
      beat(
        'debate',
        'Debate',
        0.15,
        'Act One',
        'What question do they wrestle with before acting?',
      ),
      beat(
        'break-two',
        'Break into Two',
        0.2,
        'Act Two',
        'What choice takes them into the upside-down world?',
      ),
      beat(
        'b-story',
        'B Story',
        0.22,
        'Act Two',
        'Who is the new relationship that carries the theme?',
      ),
      beat('fun', 'Fun and Games', 0.35, 'Act Two', 'What’s the promise of the premise? Show it.'),
      beat(
        'midpoint',
        'Midpoint',
        0.5,
        'Act Two',
        'A false victory or a false defeat: which, and how do the stakes rise?',
      ),
      beat(
        'bad-guys',
        'Bad Guys Close In',
        0.62,
        'Act Two',
        'How do enemies outside and flaws inside tighten?',
      ),
      beat(
        'all-lost',
        'All Is Lost',
        0.75,
        'Act Two',
        'What’s the worst moment? What or who dies, even symbolically?',
      ),
      beat(
        'dark-night',
        'Dark Night of the Soul',
        0.8,
        'Act Two',
        'How do they react, and what do they finally realize?',
      ),
      beat(
        'break-three',
        'Break into Three',
        0.85,
        'Act Three',
        'What idea, from the A and B stories together, gives them the answer?',
      ),
      beat(
        'finale',
        'Finale',
        0.93,
        'Act Three',
        'How do they prove they’ve changed and win, or lose, for good?',
      ),
      beat(
        'final-image',
        'Final Image',
        0.99,
        'Act Three',
        'How does the last snapshot mirror the opening one?',
      ),
    ],
  },
  {
    key: 'story-circle',
    name: 'Story Circle',
    origin: 'Dan Harmon',
    bestFor: 'TV episodes and character-driven stories',
    beats: [
      beat('you', 'You', 0.03, 'Order', 'Who is the character, in their comfort zone?'),
      beat('need', 'Need', 0.12, 'Order', 'What do they want?'),
      beat('go', 'Go', 0.25, 'Chaos', 'What unfamiliar situation do they enter?'),
      beat('search', 'Search', 0.38, 'Chaos', 'How do they adapt to it?'),
      beat('find', 'Find', 0.5, 'Chaos', 'What do they get?'),
      beat('take', 'Take', 0.62, 'Chaos', 'What heavy price do they pay for it?'),
      beat('return', 'Return', 0.8, 'Order', 'How do they go back to the familiar?'),
      beat('change', 'Change', 0.95, 'Order', 'How have they changed?'),
    ],
  },
  {
    key: 'seven-point',
    name: 'Seven-Point Structure',
    origin: 'Dan Wells',
    bestFor: 'Plotting backward from the ending',
    beats: [
      beat(
        'hook',
        'Hook',
        0.03,
        'Setup',
        'Where does your hero start? Plan it as the opposite of the resolution.',
      ),
      beat(
        'turn-1',
        'Plot Turn One',
        0.2,
        'Setup',
        'What changes the hero’s world and starts the conflict?',
      ),
      beat(
        'pinch-1',
        'Pinch One',
        0.35,
        'Middle',
        'What pressure from the antagonist forces them to act?',
      ),
      beat('midpoint', 'Midpoint', 0.5, 'Middle', 'When do they move from reacting to acting?'),
      beat('pinch-2', 'Pinch Two', 0.65, 'Middle', 'What goes terribly wrong? What’s taken away?'),
      beat(
        'turn-2',
        'Plot Turn Two',
        0.8,
        'End',
        'What final piece do they find that makes the ending possible?',
      ),
      beat('resolution', 'Resolution', 0.97, 'End', 'How does the story end? Plan this one first.'),
    ],
  },
  {
    key: 'freytag',
    name: 'Freytag’s Pyramid',
    origin: 'Gustav Freytag',
    bestFor: 'Tragedy and classic drama',
    beats: [
      beat('exposition', 'Exposition', 0.08, 'Rise', 'Who, where, and what’s at stake?'),
      beat('rising', 'Rising Action', 0.3, 'Rise', 'How does the conflict build?'),
      beat('climax', 'Climax', 0.5, 'Turn', 'What is the turning point where fortunes reverse?'),
      beat('falling', 'Falling Action', 0.72, 'Fall', 'How do the consequences unravel?'),
      beat('denouement', 'Denouement', 0.95, 'Fall', 'How does it end: catastrophe, or release?'),
    ],
  },
  {
    key: 'kishotenketsu',
    name: 'Kishōtenketsu',
    origin: 'Classical Chinese and Japanese poetry',
    bestFor: 'Quiet, literary, and slice-of-life stories',
    beats: [
      beat(
        'ki',
        'Introduction (Ki)',
        0.1,
        'Ki',
        'Who are the characters, and what is their world like?',
      ),
      beat(
        'sho',
        'Development (Shō)',
        0.35,
        'Shō',
        'How does that world deepen, without conflict yet?',
      ),
      beat(
        'ten',
        'Twist (Ten)',
        0.65,
        'Ten',
        'What unexpected turn or new element shifts everything?',
      ),
      beat(
        'ketsu',
        'Reconciliation (Ketsu)',
        0.92,
        'Ketsu',
        'How do the first parts and the twist come together?',
      ),
    ],
  },
];

export const DEFAULT_STRUCTURE = 'monomyth';

const BY_KEY = new Map(STRUCTURES.map((s) => [s.key, s]));

/** A structure by key, falling back to the Monomyth. */
export const structureByKey = (key: string | undefined): Structure =>
  BY_KEY.get(key ?? '') ?? BY_KEY.get(DEFAULT_STRUCTURE)!;
