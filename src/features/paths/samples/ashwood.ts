import type { SampleStory } from './types';

/** The Ashwood, the first story from the old Shadow Paths site, with its pictures. */
export const ashwood: SampleStory = {
  key: 'ashwood',
  title: 'The Lantern in the Ashwood',
  blurb:
    'On a rainy night, you step into the Ashwood. Somewhere in the dark, a lantern burns with a strange light.',
  categories: ['Fantasy', 'Horror'],
  cover: '/paths-art/ashwood.webp',
  start: 'start',
  passages: {
    start: {
      title: 'The Forest Path',
      sound: 'rain',
      art: '/paths-art/ashwood/start.webp',
      text: ['The forest path twists ahead, slick with rain. A lantern flickers deeper inside.'],
      choices: [
        { label: 'Approach the lantern', to: 'lantern' },
        { label: 'Turn back to the road', to: 'safe' },
      ],
    },
    lantern: {
      title: 'The Lantern',
      sound: 'heartbeat',
      art: '/paths-art/ashwood/lantern.webp',
      text: ['The lantern hangs from a crooked branch. Its flame pulses like a heartbeat.'],
      choices: [
        { label: 'Take the lantern', to: 'consumed' },
        { label: 'Leave it and walk on', to: 'clearing' },
      ],
    },
    clearing: {
      title: 'The Clearing',
      sound: 'drone',
      art: '/paths-art/ashwood/clearing.webp',
      text: [
        'You enter a clearing. The trees are silent. A shadow moves at the edge of your vision.',
      ],
      choices: [
        { label: 'Follow the shadow', to: 'stag' },
        { label: 'Stand your ground', to: 'keeper' },
      ],
    },
    safe: {
      title: 'The Safe Path',
      art: '/paths-art/ashwood/safe.webp',
      ending: 'other',
      text: [
        'You walk away. The Ashwood swallows its secrets, and you live to wonder another day.',
      ],
    },
    consumed: {
      title: 'Lantern Consumed',
      sound: 'fire',
      art: '/paths-art/ashwood/fire.webp',
      ending: 'death',
      text: ['The moment you touch the lantern, fire engulfs you. The Ashwood drinks your ashes.'],
    },
    stag: {
      title: 'Hollow Stag',
      art: '/paths-art/ashwood/stag.webp',
      ending: 'death',
      text: [
        'The shadow resolves into antlers. The Hollow Stag lowers its head and silence falls forever.',
      ],
    },
    keeper: {
      title: 'Keeper of the Flame',
      sound: 'fire',
      art: '/paths-art/ashwood/true.webp',
      ending: 'true',
      text: [
        'You stand unafraid. The lantern appears in your hand, burning steady. You are chosen as Keeper of the Flame.',
      ],
    },
  },
};
