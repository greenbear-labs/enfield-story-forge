import type { ColumnType, IndexView } from './worldModel';

export interface PresetColumn {
  name: string;
  type: ColumnType;
  options?: string[];
}

/** A ready-made index: its name, what one entry in it is called, and its columns. */
export interface IndexPreset {
  key: string;
  name: string;
  /** One entry, for buttons: "New place". */
  item: string;
  icon: string;
  blurb: string;
  /** Set on every page made in this index. Scenes pick their locations from "location" pages. */
  template: string;
  view: IndexView;
  columns: PresetColumn[];
}

const summary: PresetColumn = { name: 'Summary', type: 'text' };

export const INDEX_PRESETS: IndexPreset[] = [
  {
    key: 'places',
    name: 'Places',
    item: 'place',
    icon: '🏰',
    blurb: 'Cities, regions, landmarks, and the rooms where scenes happen.',
    template: 'location',
    view: 'list',
    columns: [
      {
        name: 'Kind',
        type: 'choice',
        options: ['City', 'Town', 'Village', 'Region', 'Landmark', 'Building', 'Wilds'],
      },
      { name: 'Region', type: 'text' },
      summary,
    ],
  },
  {
    key: 'peoples',
    name: 'Peoples',
    item: 'people',
    icon: '🧝',
    blurb: 'Races, cultures, and nations.',
    template: 'people',
    view: 'gallery',
    columns: [{ name: 'Homeland', type: 'text' }, { name: 'Language', type: 'text' }, summary],
  },
  {
    key: 'creatures',
    name: 'Creatures',
    item: 'creature',
    icon: '🐉',
    blurb: 'Beasts, monsters, and everything that lives in the wild.',
    template: 'creature',
    view: 'gallery',
    columns: [
      { name: 'Habitat', type: 'text' },
      { name: 'Danger', type: 'choice', options: ['Harmless', 'Wary', 'Dangerous', 'Deadly'] },
      summary,
    ],
  },
  {
    key: 'items',
    name: 'Items',
    item: 'item',
    icon: '🗡️',
    blurb: 'Weapons, relics, treasures, and the things people carry.',
    template: 'item',
    view: 'list',
    columns: [
      {
        name: 'Kind',
        type: 'choice',
        options: ['Weapon', 'Tool', 'Relic', 'Treasure', 'Everyday'],
      },
      { name: 'Owner', type: 'text' },
      summary,
    ],
  },
  {
    key: 'magic',
    name: 'Magic',
    item: 'magic',
    icon: '✨',
    blurb: 'Magic systems and powers: where they come from, what they cost, and their limits.',
    template: 'magic',
    view: 'list',
    columns: [
      { name: 'Source', type: 'text' },
      { name: 'Cost', type: 'text' },
      { name: 'Limits', type: 'text' },
    ],
  },
  {
    key: 'factions',
    name: 'Factions',
    item: 'faction',
    icon: '🛡️',
    blurb: 'Guilds, houses, cults, and anyone who wants something together.',
    template: 'faction',
    view: 'list',
    columns: [
      { name: 'Leader', type: 'text' },
      { name: 'Goal', type: 'text' },
      { name: 'Base', type: 'text' },
    ],
  },
  {
    key: 'history',
    name: 'History',
    item: 'event',
    icon: '📜',
    blurb: 'Wars, founding days, and the events everyone still talks about.',
    template: 'event',
    view: 'table',
    columns: [{ name: 'When', type: 'text' }, { name: 'Where', type: 'text' }, summary],
  },
  {
    key: 'sessions',
    name: 'Sessions',
    item: 'session',
    icon: '🎲',
    blurb: 'What happened at each game night.',
    template: 'session',
    view: 'table',
    columns: [{ name: 'Number', type: 'number' }, { name: 'Date', type: 'text' }, summary],
  },
  {
    key: 'npcs',
    name: 'People met',
    item: 'person',
    icon: '🗣️',
    blurb: 'The characters the players meet, and how they feel about them.',
    template: 'npc',
    view: 'table',
    columns: [
      { name: 'Role', type: 'text' },
      { name: 'Where', type: 'text' },
      { name: 'Attitude', type: 'choice', options: ['Friendly', 'Neutral', 'Hostile'] },
    ],
  },
  {
    key: 'bestiary',
    name: 'Bestiary',
    item: 'monster',
    icon: '👹',
    blurb: 'Monsters with their stats, ready for the table.',
    template: 'monster',
    view: 'table',
    columns: [
      { name: 'Challenge', type: 'number' },
      { name: 'Type', type: 'text' },
      { name: 'Habitat', type: 'text' },
    ],
  },
  {
    key: 'sources',
    name: 'Sources',
    item: 'source',
    icon: '📚',
    blurb: 'Books, articles, and links, with what you took from each.',
    template: 'source',
    view: 'table',
    columns: [
      { name: 'Author', type: 'text' },
      { name: 'Link', type: 'text' },
      { name: 'Notes', type: 'text' },
    ],
  },
  {
    key: 'topics',
    name: 'Topics',
    item: 'topic',
    icon: '🔎',
    blurb: 'What you’ve learned, one subject per page.',
    template: 'topic',
    view: 'list',
    columns: [{ name: 'Tags', type: 'tags' }, summary],
  },
];

/** An index you name yourself. */
export const CUSTOM_PRESET: IndexPreset = {
  key: 'custom',
  name: '',
  item: 'page',
  icon: '📄',
  blurb: 'Anything else, with your own columns.',
  template: 'page',
  view: 'list',
  columns: [summary],
};

export const presetByKey = (key: unknown): IndexPreset =>
  INDEX_PRESETS.find((p) => p.key === key) ?? CUSTOM_PRESET;

/** A new notebook can start with a set of indexes. */
export interface NotebookStarter {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  indexes: string[];
}

export const NOTEBOOK_STARTERS: NotebookStarter[] = [
  {
    key: 'world',
    name: 'A story world',
    icon: '🌍',
    blurb: 'Places, peoples, creatures, items, magic, factions, and history.',
    indexes: ['places', 'peoples', 'creatures', 'items', 'magic', 'factions', 'history'],
  },
  {
    key: 'campaign',
    name: 'A game campaign',
    icon: '🎲',
    blurb: 'Sessions, the people the players meet, places, a bestiary, and loot.',
    indexes: ['sessions', 'npcs', 'places', 'bestiary', 'items'],
  },
  {
    key: 'research',
    name: 'Research notes',
    icon: '📚',
    blurb: 'Sources and topics, for the facts behind a story.',
    indexes: ['sources', 'topics'],
  },
  {
    key: 'blank',
    name: 'Blank',
    icon: '📓',
    blurb: 'Start empty and add your own indexes.',
    indexes: [],
  },
];
