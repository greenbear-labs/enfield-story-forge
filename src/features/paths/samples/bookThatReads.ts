import type { SampleStory } from './types';

export const bookThatReads: SampleStory = {
  key: 'book-that-reads',
  title: 'The Book That Reads You',
  blurb: 'The library closed an hour ago. The book on the desk has only just opened.',
  categories: ['Fantasy', 'Mystery'],
  cover: '/paths-art/book-magic.webp',
  vars: {
    named: { name: 'told the book your name', kind: 'flag' },
    pages: { name: 'Pages read', kind: 'counter', start: 0 },
    quill: { name: 'the silver quill', kind: 'item' },
  },
  start: 'rain',
  passages: {
    rain: {
      title: 'Rain on the Window',
      sound: 'rain',
      text: [
        'The library closed an hour ago, but you are still inside, and so is the rain.',
        'On the desk in front of you, a book has opened by itself. Its first line reads: Hello. Who is reading me?',
      ],
      choices: [
        { label: 'Write your name in the margin', to: 'named', does: [{ var: 'named', op: 'on' }] },
        {
          label: 'Read on without answering',
          to: 'chapter-two',
          does: [{ var: 'pages', op: 'add', value: 1 }],
        },
        { label: 'Close the book', to: 'closed' },
      ],
    },
    closed: {
      title: 'Closed',
      text: [
        'You shut the cover. The book sighs, a small papery sound, and is just a book again.',
        'You go home. You never find out what it wanted, and some nights that keeps you awake.',
      ],
      ending: 'other',
    },
    named: {
      title: 'A Name in the Margin',
      text: [
        'The ink drinks your name. Gold light rises off the page in curling threads.',
        'Lovely, the book writes. Now I know where you live.',
      ],
      choices: [
        {
          label: 'Read on',
          to: 'chapter-two',
          does: [{ var: 'pages', op: 'add', value: 1 }],
        },
        { label: 'Try to scratch your name out', to: 'scratch' },
      ],
    },
    scratch: {
      title: 'Ink That Won’t Fade',
      text: [
        'The harder you scratch, the brighter your name glows.',
        'Behind you, a drawer in the librarian’s desk slides open on its own. Inside lies a silver quill.',
      ],
      choices: [
        {
          label: 'Take the quill and keep reading',
          to: 'chapter-two',
          does: [
            { var: 'quill', op: 'gain' },
            { var: 'pages', op: 'add', value: 1 },
          ],
        },
      ],
    },
    'chapter-two': {
      title: 'The Second Chapter',
      text: [
        'The book is telling a story about someone stuck in a library on a rainy night. It is very accurate. It knows what you had for breakfast.',
      ],
      lines: [
        { text: 'It uses your name. It spells it beautifully.', when: { var: 'named', op: 'on' } },
      ],
      choices: [
        {
          label: 'Turn the page',
          to: 'last-chapter',
          does: [{ var: 'pages', op: 'add', value: 2 }],
        },
        { label: 'Look up from the book', to: 'stacks' },
      ],
    },
    stacks: {
      title: 'Someone in the Stacks',
      sound: 'drone',
      text: [
        'Between two shelves stands a person made of pages, rustling softly. They have no face yet.',
        'They are waiting for the book to finish describing one.',
      ],
      choices: [
        { label: 'Run for the door', to: 'door' },
        {
          label: 'Sit down and keep reading',
          to: 'last-chapter',
          does: [{ var: 'pages', op: 'add', value: 1 }],
        },
      ],
    },
    door: {
      title: 'The Door',
      text: [
        'The door is not where it was. The door is not anywhere.',
        'The rustling comes closer, and the last thing you feel is a gentle, papery hand turning you to the next page.',
      ],
      ending: 'death',
    },
    'last-chapter': {
      title: 'The Last Chapter',
      sound: 'heartbeat',
      text: [
        'Only one page is left. The story says that the reader, having read this far, becomes part of the book.',
      ],
      lines: [
        {
          text: 'You have read too much to stop now. Your fingertips are going pale and thin as paper.',
          when: { var: 'pages', op: 'atLeast', value: 3 },
        },
      ],
      choices: [
        { label: 'Read the last page', to: 'bound' },
        {
          label: 'Write a new ending with the silver quill',
          to: 'own-ending',
          needs: [{ var: 'quill', op: 'has' }],
        },
        { label: 'Tear out the last page', to: 'torn' },
      ],
    },
    bound: {
      title: 'Bound',
      text: [
        'You read the last line, and the library goes quiet.',
        'Somewhere a new book sits on a desk, its first line in your handwriting: Hello. Who is reading me?',
      ],
      ending: 'death',
    },
    'own-ending': {
      title: 'Your Own Ending',
      text: [
        'The quill writes faster than you can think: And the reader closed the book, went home, and was never afraid of the rain again.',
        'The page-person bows and crumbles to dust. Outside, the rain stops.',
      ],
      lines: [
        {
          text: 'On the first page, your name fades to a warm gold, like a signature.',
          when: { var: 'named', op: 'on' },
        },
      ],
      ending: 'true',
    },
    torn: {
      title: 'The Torn Page',
      text: [
        'The page comes away with a sound like a scream. In your hand it folds itself into a paper bird and flies off into the stacks.',
        'The book is blank now. It has room for a whole new story, and it seems to be waiting for you to write one.',
      ],
      ending: 'secret',
    },
  },
};
