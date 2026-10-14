import type { SampleStory } from './types';

export const fogGlade: SampleStory = {
  key: 'fog-glade',
  title: 'The Fog Glade',
  blurb: 'Once a year the glade grants one wish, to whoever reaches the old well first.',
  categories: ['Mythic', 'Adventure'],
  cover: '/paths-art/fog-glade.webp',
  vars: {
    coin: { name: 'a silver coin', kind: 'item' },
    fox: { name: 'kept the fox’s secret', kind: 'flag' },
  },
  start: 'edge',
  passages: {
    edge: {
      title: 'The Edge of the Fog',
      sound: 'night',
      text: [
        'At the edge of the village the fog stands like a wall. The elders say the glade inside grants one wish a year, to whoever reaches the old well first. Tonight is the night.',
        'At your feet lies a silver coin, as if someone dropped it there on purpose.',
      ],
      choices: [
        {
          label: 'Pick up the coin, then step into the fog',
          to: 'two-lights',
          does: [{ var: 'coin', op: 'gain' }],
        },
        { label: 'Leave the coin and step into the fog', to: 'two-lights' },
      ],
    },
    'two-lights': {
      title: 'Two Lights',
      sound: 'wind',
      text: [
        'Inside, the world is white and soft and silent. Two lights glimmer ahead: one low and green, one high and gold.',
      ],
      choices: [
        { label: 'Follow the green light', to: 'fox' },
        { label: 'Follow the gold light', to: 'gold-light' },
      ],
    },
    'gold-light': {
      title: 'The Gold Light',
      text: [
        'The gold light is a lantern, held by something tall and thin and patient. It has been holding it out for travelers for three hundred years.',
        'It is delighted to see you.',
      ],
      ending: 'death',
    },
    fox: {
      title: 'The Fox in the Ferns',
      text: [
        'The green light is a fox’s eyes. “Wishes cost,” says the fox. “Promise never to tell anyone you can understand me, and I’ll show you the short way.”',
      ],
      choices: [
        { label: 'Promise', to: 'well', does: [{ var: 'fox', op: 'on' }] },
        { label: 'Refuse, and find your own way', to: 'bridge' },
      ],
    },
    bridge: {
      title: 'The Bridge of Hands',
      text: [
        'A rope bridge crosses a gully brimming with fog. Halfway across, pale hands reach up from below, palms open, asking for something.',
      ],
      choices: [
        {
          label: 'Drop your silver coin into the hands',
          to: 'well',
          needs: [{ var: 'coin', op: 'has' }],
          does: [{ var: 'coin', op: 'lose' }],
        },
        { label: 'Run for the far side', to: 'gully' },
      ],
    },
    gully: {
      title: 'The Gully',
      text: [
        'The ropes sway and your foot slips. The hands, which were only asking before, catch you very carefully, and do not let go.',
      ],
      ending: 'death',
    },
    well: {
      title: 'The Old Well',
      sound: 'drone',
      text: [
        'The well is ringed with wildflowers that glow faintly in the fog. You are first.',
        'The water is perfectly still, and your reflection smiles a moment before you do.',
      ],
      lines: [
        {
          text: 'The fox sits beside you, pretending to be an ordinary fox.',
          when: { var: 'fox', op: 'on' },
        },
      ],
      choices: [
        { label: 'Wish for gold', to: 'gold' },
        { label: 'Wish to go home safe', to: 'home' },
        {
          label: 'Toss in the silver coin and wish for nothing',
          to: 'nothing',
          needs: [{ var: 'coin', op: 'has' }],
        },
      ],
    },
    gold: {
      title: 'A Pocketful',
      text: [
        'Your pockets grow heavy, then heavier, then far too heavy.',
        'You will be rich for the rest of your life, which you will spend here, sitting by the well, unable to stand.',
      ],
      ending: 'other',
    },
    home: {
      title: 'The Way Home',
      sound: 'night',
      text: ['The fog parts like curtains, and you walk home through ordinary moonlight.'],
      lines: [
        {
          text: 'Every year after, on this night, a fox waits at the edge of the fog to walk you safely in and out.',
          when: { var: 'fox', op: 'on' },
        },
      ],
      ending: 'true',
    },
    nothing: {
      title: 'Wish for Nothing',
      text: [
        'The coin sinks without a sound. The fog lifts all at once: the glade is only a meadow, the well is only a well, and you feel lighter than you have in your whole life.',
        'Wishing for nothing, it turns out, is the one wish the glade was waiting for.',
      ],
      ending: 'secret',
    },
  },
};
