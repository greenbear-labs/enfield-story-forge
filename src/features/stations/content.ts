import type { StationContent } from './StationPage';

/** Station copy and tools, from studio-structure-v3.md and the v3 wireframe. */

export const shardsStation: StationContent = {
  sec: 'shard',
  icon: 'shard',
  title: 'Story Shards',
  num: 1,
  blurb:
    'A story shard is any spark of an idea: a place, a character, a moment, a magic system, an item, a question. It doesn’t have to fit anywhere yet. Save it before it’s lost.',
  infoLabel: 'What is a story shard?',
  next: { label: 'Concepts', to: '/concepts', sec: 'concept' },
  tools: [
    {
      name: 'Create a Shard',
      icon: 'plus',
      description: 'Capture a spark in seconds, with a type and tags. Also on + Shard everywhere.',
    },
    {
      name: 'The Shard Mines',
      icon: 'mine',
      description:
        'Pick shards, drop them in the mine cart, and forge them into a group or a story concept.',
    },
    {
      name: 'Spark Prompts',
      icon: 'spark',
      description: 'Random "what if" prompts to shake loose new shards.',
    },
  ],
  collections: [
    { title: 'Shard groups', empty: 'No shard groups yet. Forge one in the Shard Mines.' },
  ],
  library: { title: 'Shard library', empty: 'No shards yet. Your first spark will land here.' },
};

export const conceptsStation: StationContent = {
  sec: 'concept',
  icon: 'concept',
  title: 'Concepts',
  num: 2,
  blurb:
    'A concept is a story idea you could pitch in one sentence: who it’s about, what they want, and what stands in the way. Build one from shards, generate one, or mash two together.',
  infoLabel: 'What makes a strong concept?',
  next: { label: 'Outline Builder', to: '/outlines', sec: 'story' },
  tools: [
    {
      name: 'Concept Generator',
      icon: 'grid',
      description:
        'Click one box per column and a concept sentence builds itself. Re-roll anything you haven’t locked.',
    },
    {
      name: 'The Mashup',
      icon: 'mash',
      description: 'Put two concepts side by side, keep the best of each, and write something new.',
    },
    {
      name: 'From the Shard Mines',
      icon: 'mine',
      description: 'Pick a shard group and shape it into a concept, with its shards beside you.',
    },
  ],
  library: {
    title: 'Concept Bank',
    empty: 'No concepts yet. Generate one, or send a shard group here.',
  },
};

export const outlinesStation: StationContent = {
  sec: 'story',
  icon: 'outline',
  title: 'Outline Builder',
  num: 3,
  blurb:
    'An outline is the skeleton of your story. Choose a structure, like the Hero’s Journey or Three Acts, fill in its beats, and you’ll know where the story is going before you write it.',
  infoLabel: 'Story structures explained',
  next: { label: 'Writer’s Desk', to: '/desk', sec: 'desk' },
  tools: [
    {
      name: 'New Outline',
      icon: 'plus',
      description:
        'Start from a concept, a theme, an ending, or a character. The Hero’s Journey is preselected.',
    },
    {
      name: 'Story Spine',
      icon: 'spine',
      description: 'Logline, theme question, ending, and your hero’s want, need, lie, and truth.',
    },
    {
      name: 'Beat Board',
      icon: 'board',
      description:
        'Fill in each beat, overlay a second structure, and spread beats across chapters.',
    },
  ],
  library: { title: 'Your outlines', empty: 'No outlines yet. Send a concept here to start one.' },
};

export const deskStation: StationContent = {
  sec: 'desk',
  icon: 'desk',
  title: 'Writer’s Desk',
  num: 4,
  blurb:
    'This is where the story gets written. Break your outline into chapters, chapters into scenes, then sit down with one scene at a time. It all works offline.',
  infoLabel: 'From outline to chapters',
  tools: [
    {
      name: 'Chapter Breakdown',
      icon: 'grid',
      description:
        'Every plotline across every chapter, so you can see what’s quiet and what’s crowded.',
    },
    {
      name: 'Chapter Builder',
      icon: 'board',
      description: 'The scenes and beats inside one chapter, in order.',
    },
    {
      name: 'Scene Desk',
      icon: 'scene',
      description:
        'Set up the scene on the side, write the prose, and go full screen with focus mode.',
    },
    {
      name: 'Import a draft',
      icon: 'upload',
      description:
        'Already writing? Bring a Word, Markdown, or text file in as chapters and scenes.',
    },
  ],
  library: {
    title: 'Your manuscripts',
    empty: 'No manuscripts yet. Send an outline here to begin, or import a draft you already have.',
  },
};

export const charactersStation: StationContent = {
  sec: 'char',
  icon: 'char',
  title: 'Character Center',
  blurb:
    'Every character gets the same card, wherever they appear. Start with the basics, then add modules (backstory, arc, voice, images) only when you need them.',
  infoLabel: 'Building characters readers believe',
  tools: [
    {
      name: 'Quick Card',
      icon: 'card',
      description: 'Name, role, want, need. A new character in under a minute.',
    },
    {
      name: 'Character Interview',
      icon: 'chat',
      description: 'Answer one question at a time and discover who they are.',
    },
    {
      name: 'Archetype Spark',
      icon: 'dice',
      description: 'A random role, flaw, wound, and want to start from.',
    },
    {
      name: 'Relationship Web',
      icon: 'web',
      description: 'A map of how your cast connects: family, friends, rivals, and enemies.',
    },
  ],
  library: {
    title: 'Character library',
    empty: 'No characters yet. A Quick Card takes under a minute.',
  },
};
