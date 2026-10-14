import type { SampleStory } from './types';

export const lanternKeeper: SampleStory = {
  key: 'lantern-keeper',
  title: 'The Lantern Keeper',
  blurb: 'A lighthouse stands in a field where no sea has ever been, and it needs a keeper.',
  categories: ['Horror', 'Mystery'],
  cover: '/paths-art/lantern-path.webp',
  vars: {
    lantern: { name: 'the lantern', kind: 'item' },
    courage: { name: 'Courage', kind: 'counter', start: 1 },
    oath: { name: 'swore the keeper’s oath', kind: 'flag' },
  },
  start: 'gate',
  passages: {
    gate: {
      title: 'The Gate at Dusk',
      text: [
        'The path to Hollowmere ends at a rusted gate. Beyond it stand a cottage with one lit window and a lighthouse in the middle of a field, miles from any sea.',
        'A note is tied to the gate with black ribbon: KEEPER WANTED. ASK WITHIN.',
      ],
      choices: [
        { label: 'Knock at the cottage', to: 'cottage' },
        { label: 'Cut straight across the field to the lighthouse', to: 'field' },
        { label: 'Turn back the way you came', to: 'road' },
      ],
    },
    road: {
      title: 'The Road Home',
      text: [
        'You walk until the gate is a speck, then a memory, then nothing at all. At home you sleep soundly.',
        'Years later you still dream of one lit window, waiting.',
      ],
      ending: 'other',
    },
    cottage: {
      title: 'The Cottage',
      text: [
        'An old woman opens the door before you knock. “You’re late,” she says, as if she has been expecting you for a hundred years.',
        'On the table sit a brass lantern, unlit, and a cup of tea, still steaming.',
      ],
      choices: [
        {
          label: 'Take the lantern',
          to: 'warning',
          does: [
            { var: 'lantern', op: 'gain' },
            { var: 'courage', op: 'add', value: 1 },
          ],
        },
        { label: 'Drink the tea', to: 'tea' },
        { label: 'Leave, and cross the field', to: 'field' },
      ],
    },
    tea: {
      title: 'The Tea',
      text: [
        'It tastes of cloves and rain. The room grows warm, then soft, then very far away.',
        'When you wake, your hands are spotted and old, the lantern is on the table, and someone young is standing at the gate.',
      ],
      ending: 'other',
    },
    warning: {
      title: 'The Keeper’s Warning',
      text: [
        '“The light must never go out,” she says, pressing the lantern into your hands. It is colder than it should be.',
        '“And whatever calls to you from the field, do not answer it.”',
      ],
      choices: [
        { label: 'Swear to keep the light', to: 'field', does: [{ var: 'oath', op: 'on' }] },
        { label: 'Go without promising anything', to: 'field' },
      ],
    },
    field: {
      title: 'The Field of Bells',
      text: [
        'The grass is waist-high and full of small brass bells that ring without any wind.',
        'Halfway across, a voice you know calls your name. It sounds like your mother. It sounds like you.',
      ],
      lines: [
        {
          text: 'The lantern flickers, and for a moment you see that the bells are tied to bones.',
          when: { var: 'lantern', op: 'has' },
        },
      ],
      choices: [
        { label: 'Answer the voice', to: 'answered' },
        { label: 'Hold up the lantern', to: 'lit-path', needs: [{ var: 'lantern', op: 'has' }] },
        { label: 'Keep walking, eyes on the tower', to: 'door' },
      ],
    },
    answered: {
      title: 'Answered',
      text: [
        '“Here,” you say. Every bell falls silent at once.',
        'The grass closes over you like water, gently, and the field has one more bell.',
      ],
      ending: 'death',
    },
    'lit-path': {
      title: 'Light in the Grass',
      text: [
        'You raise the lantern. The voice stops mid-word. Shapes in the grass turn away from the glow, and a narrow path opens straight to the lighthouse.',
      ],
      choices: [
        {
          label: 'Walk the lit path',
          to: 'door',
          does: [{ var: 'courage', op: 'add', value: 1 }],
        },
      ],
    },
    door: {
      title: 'The Lighthouse Door',
      text: [
        'The door stands open. Stairs wind up into the dark, and something at the top is breathing slowly, like the sea.',
      ],
      lines: [
        { text: 'Your hands are shaking.', when: { var: 'courage', op: 'atMost', value: 1 } },
      ],
      choices: [
        {
          label: 'Climb the stairs',
          to: 'lamp-room',
          needs: [{ var: 'courage', op: 'atLeast', value: 2 }],
        },
        { label: 'Wait at the bottom for morning', to: 'waiting' },
      ],
    },
    waiting: {
      title: 'Morning Never Comes',
      text: [
        'You sit on the bottom step and wait for dawn. It does not come. It has not come here for a very long time, you realize.',
        'The others sitting on the steps beside you nod, as if to say: yes, we waited too.',
      ],
      ending: 'death',
    },
    'lamp-room': {
      title: 'The Lamp Room',
      text: [
        'At the top, the great lamp is dark. In its glass you see the field below, and in the field every traveler who ever answered the voice, looking up at you.',
        'The lamp needs a flame.',
      ],
      choices: [
        {
          label: 'Light the great lamp with your lantern',
          to: 'keeper',
          needs: [{ var: 'lantern', op: 'has' }],
        },
        { label: 'Break the glass and let them out', to: 'set-free' },
        { label: 'Ring the old brass bell beside the lamp', to: 'the-sea', cost: 5 },
      ],
    },
    keeper: {
      title: 'The Keeper',
      text: [
        'The flame leaps from your lantern into the great lamp, and light pours across the field. The bells ring once, all together, and fall still.',
        'Far below, the old woman waves from her doorway, then fades like breath on a window. The light is yours to keep now.',
      ],
      lines: [
        {
          text: 'You remember your oath, and find you don’t mind at all.',
          when: { var: 'oath', op: 'on' },
        },
      ],
      ending: 'true',
    },
    'the-sea': {
      title: 'The Bell That Calls the Sea',
      text: [
        'You ring it once. Far off, impossibly, you hear waves.',
        'By morning the field is a shore and the lighthouse has its sea at last. On the tide, every lost traveler comes wading home, shaking the grass from their hair.',
      ],
      ending: 'secret',
    },
    'set-free': {
      title: 'The Field Set Free',
      text: [
        'The glass shatters into a thousand stars. One by one, the lost climb out of the grass and walk away down the road, laughing, toward a dawn that has finally remembered this place.',
        'You stay. Somebody has to.',
      ],
      ending: 'secret',
    },
  },
};
