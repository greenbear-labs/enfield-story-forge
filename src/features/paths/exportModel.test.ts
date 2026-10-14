import { afterEach, describe, expect, it } from 'vitest';
import {
  harlowePassage,
  playableHtml,
  storyFile,
  storyFileName,
  twineArchive,
  twineIfid,
  twineVarNames,
} from './exportModel';
import { sampleAdventureFields, samplePassageFields, textDoc } from './sampleModel';
import { SAMPLE_STORIES } from './samples';
import { storyVars } from './stateModel';
import { runStory } from './storyFilePlayer';

/** A sample as the entries it would become, with passage keys as ids. */
function built(key: string) {
  const sample = SAMPLE_STORIES.find((s) => s.key === key)!;
  const adventure = {
    id: `adv-${key}`,
    title: sample.title,
    fields: { ...sampleAdventureFields(sample), startId: sample.start },
  };
  const passages = Object.entries(sample.passages).map(([id, p]) => ({
    id,
    title: p.title,
    fields: {
      ...(p.ending ? { ending: p.ending } : {}),
      ...samplePassageFields(sample, id, (k) => k),
    },
  }));
  const bodies = new Map(Object.entries(sample.passages).map(([id, p]) => [id, textDoc(p.text)]));
  return { adventure, passages, bodies };
}

const fog = () => {
  const { adventure, passages, bodies } = built('fog-glade');
  return storyFile(adventure, passages, bodies, (e) =>
    e.id === adventure.id ? 'cover.webp' : null,
  );
};

afterEach(() => {
  document.body.replaceChildren();
});

const click = (root: HTMLElement, label: string | RegExp) => {
  const b = [...root.querySelectorAll('button')].find((x) =>
    typeof label === 'string' ? x.textContent?.startsWith(label) : label.test(x.textContent ?? ''),
  );
  if (!b) throw new Error(`No button ${label}`);
  b.click();
  return b;
};
const buttonFor = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll('button')].find((x) => x.textContent?.startsWith(label))!;

describe('storyFile', () => {
  it('keeps what a reader needs: prose, lines, choices with their needs, endings', () => {
    const story = fog();
    expect(story.title).toBe('The Fog Glade');
    expect(story.cover).toBe('cover.webp');
    expect(story.start).toBe('edge');
    expect(story.passages.well!.lines).toEqual([
      {
        text: 'The fox sits beside you, pretending to be an ordinary fox.',
        when: { var: 'fox', op: 'on', value: 0 },
      },
    ]);
    expect(story.passages.bridge!.choices[0]).toMatchObject({
      to: 'well',
      needs: [{ var: 'coin', op: 'has', value: 0, text: 'has a silver coin' }],
      does: [{ var: 'coin', op: 'lose', value: 0 }],
    });
    expect(story.passages.gully!.ending).toBe('Death');
    expect(story.passages.edge!.html).toContain('<p>At the edge of the village');
  });

  it('drops choices into passages that are gone', () => {
    const { adventure, passages, bodies } = built('fog-glade');
    const story = storyFile(
      adventure,
      passages.filter((p) => p.id !== 'gold-light'),
      bodies,
      () => null,
    );
    expect(story.passages['two-lights']!.choices.map((c) => c.to)).toEqual(['fox', null]);
  });
});

describe('runStory', () => {
  it('plays by the story’s rules: needs, changes, lines, endings, back, start over', () => {
    const root = document.createElement('main');
    document.body.append(root);
    runStory(fog(), root);
    expect(root.querySelector('h1')?.textContent).toBe('The Fog Glade');
    click(root, 'Begin');
    expect(root.querySelector('h2')?.textContent).toBe('The Edge of the Fog');
    click(root, 'Leave the coin');
    click(root, 'Follow the green light');
    click(root, 'Refuse');
    // Without the coin, the hands are out of reach.
    const give = buttonFor(root, 'Drop your silver coin');
    expect(give.disabled).toBe(true);
    expect(give.textContent).toContain('Needs: has a silver coin');
    // Back to the start, and this time take the coin and promise the fox.
    for (let i = 0; i < 3; i++) click(root, '← Back a step');
    expect(root.querySelector('h2')?.textContent).toBe('The Edge of the Fog');
    click(root, 'Pick up the coin');
    click(root, 'Follow the green light');
    click(root, 'Promise');
    expect(root.textContent).toContain('The fox sits beside you');
    expect(buttonFor(root, 'Toss in the silver coin').disabled).toBe(false);
    click(root, 'Toss in the silver coin');
    expect(root.querySelector('.ending')?.textContent).toContain('Secret ending');
    click(root, 'Start over');
    expect(root.querySelector('h1')?.textContent).toBe('The Fog Glade');
  });

  it('runs from inside the downloaded file', () => {
    const html = playableHtml(fog());
    expect(html).toContain('<title>The Fog Glade</title>');
    const script = new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector('script')!.textContent!;
    // The story's data can't close the script early.
    expect(script).not.toMatch(/<\/script/i);
    document.body.innerHTML = '<main id="story"></main>';
    new Function(script)();
    const root = document.getElementById('story')!;
    click(root, 'Begin');
    expect(root.querySelector('h2')?.textContent).toBe('The Edge of the Fog');
  });

  it('keeps markup in titles and lines as text', () => {
    const story = fog();
    story.title = '</script><b>x</b>';
    expect(playableHtml(story)).not.toContain('</script><b>');
  });
});

describe('Twine', () => {
  it('names each thing as a Harlowe variable, once', () => {
    const names = twineVarNames([
      { id: 'a', name: 'A silver coin', kind: 'item', start: 0, order: 0 },
      { id: 'b', name: 'a silver coin!', kind: 'item', start: 0, order: 1 },
      { id: 'c', name: '', kind: 'counter', start: 2, order: 2 },
      { id: 'd', name: '3 wishes', kind: 'counter', start: 0, order: 3 },
    ]);
    expect([...names.values()]).toEqual([
      '$a_silver_coin',
      '$a_silver_coin_2',
      '$counter',
      '$_3_wishes',
    ]);
  });

  it('writes needs, changes, and lines in Harlowe', () => {
    const { adventure, passages, bodies } = built('fog-glade');
    const vars = storyVars(adventure);
    const varNames = twineVarNames(vars);
    const names = new Map(passages.map((p) => [p.id, p.title]));
    const bridge = passages.find((p) => p.id === 'bridge')!;
    const text = harlowePassage(bridge, bodies.get('bridge'), vars, varNames, names);
    expect(text).toContain(
      '(if: $a_silver_coin is true)[(link: "Drop your silver coin into the hands")[(set: $a_silver_coin to false)(go-to: "The Old Well")]](else:)[(verbatim-print: "Drop your silver coin into the hands (needs has a silver coin)")]',
    );
    expect(text).toContain('(link-goto: "Run for the far side", "The Gully")');
    const home = passages.find((p) => p.id === 'home')!;
    const end = harlowePassage(home, bodies.get('home'), vars, varNames, names);
    expect(end).toContain('(if: $kept_the_fox_s_secret is true)[Every year after');
    expect(end).toContain("''The end: True ending''");
  });

  it('prints prose Harlowe would read as markup as it is', () => {
    const { adventure, passages } = built('fog-glade');
    const vars = storyVars(adventure);
    const text = harlowePassage(
      passages[0]!,
      textDoc(['It cost $5 // or (so) they said.', 'Plain words.']),
      vars,
      twineVarNames(vars),
      new Map(),
    );
    expect(text.split('\n\n').slice(0, 2)).toEqual([
      '(verbatim-print: "It cost $5 // or (so) they said.")',
      'Plain words.',
    ]);
  });

  it('makes a Twine 2 archive with a start, a startup passage, and tagged endings', () => {
    const { adventure, passages, bodies } = built('fog-glade');
    const html = twineArchive(adventure, passages, bodies);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const story = doc.querySelector('tw-storydata')!;
    expect(story.getAttribute('name')).toBe('The Fog Glade');
    expect(story.getAttribute('format')).toBe('Harlowe');
    expect(story.getAttribute('ifid')).toBe(twineIfid(adventure.id));
    const rows = [...doc.querySelectorAll('tw-passagedata')];
    expect(rows).toHaveLength(passages.length + 1);
    const start = rows.find((r) => r.getAttribute('pid') === story.getAttribute('startnode'))!;
    expect(start.getAttribute('name')).toBe('The Edge of the Fog');
    const startup = rows.find((r) => r.getAttribute('tags') === 'startup')!;
    expect(startup.textContent).toBe(
      '(set: $a_silver_coin to false)\n(set: $kept_the_fox_s_secret to false)',
    );
    const gully = rows.find((r) => r.getAttribute('name') === 'The Gully')!;
    expect(gully.getAttribute('tags')).toBe('ending ending-death');
    // The passage text survives the HTML round trip.
    const bridge = rows.find((r) => r.getAttribute('name') === 'The Bridge of Hands')!;
    expect(bridge.textContent).toContain('(go-to: "The Old Well")');
  });

  it('gives each adventure its own steady IFID', () => {
    expect(twineIfid('abc')).toBe(twineIfid('abc'));
    expect(twineIfid('abc')).not.toBe(twineIfid('abd'));
    expect(twineIfid('abc')).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/,
    );
  });
});

describe('storyFileName', () => {
  it('makes a file name from the title', () => {
    expect(storyFileName('The Fog Glade!', '.html')).toBe('the-fog-glade.html');
    expect(storyFileName('???', '.html')).toBe('adventure.html');
  });
});
