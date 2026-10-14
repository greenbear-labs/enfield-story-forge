/**
 * The little player inside a story's downloaded HTML file. `runStory` is
 * copied into the file as source text (`runStory.toString()`), so it must
 * stand alone: no imports, nothing from outside the function, only the
 * browser. It plays by the same rules as Shadow Paths (see stateModel.ts),
 * without gems, accounts, or saving.
 */

export interface StoryFileRule {
  var: string;
  op: string;
  value: number;
  /** A need in words ("has the lantern"), shown when it isn't met. */
  text?: string;
}

export interface StoryFilePassage {
  title: string;
  /** The prose as HTML (made by proseToHtml, so already escaped). */
  html: string;
  art: string | null;
  /** The ending's label ("Death"), or null if it isn't an ending. */
  ending: string | null;
  lines: { text: string; when: StoryFileRule | null }[];
  choices: {
    label: string;
    to: string | null;
    needs: StoryFileRule[];
    does: StoryFileRule[];
  }[];
}

export interface StoryFile {
  title: string;
  blurb: string;
  cover: string | null;
  start: string | null;
  vars: { id: string; kind: string; start: number }[];
  passages: Record<string, StoryFilePassage>;
}

export function runStory(story: StoryFile, root: HTMLElement): void {
  type State = Record<string, number>;
  const startState = (): State => {
    const s: State = {};
    for (const v of story.vars) s[v.id] = v.start;
    return s;
  };
  const known = (id: string) => story.vars.some((v) => v.id === id);
  const meets = (state: State, r: StoryFileRule) => {
    if (!known(r.var)) return true;
    const at = state[r.var] ?? 0;
    if (r.op === 'has' || r.op === 'on') return at > 0;
    if (r.op === 'lacks' || r.op === 'off') return at <= 0;
    if (r.op === 'atLeast') return at >= r.value;
    if (r.op === 'atMost') return at <= r.value;
    if (r.op === 'exactly') return at === r.value;
    return true;
  };
  const apply = (state: State, rules: StoryFileRule[]): State => {
    const next = Object.assign({}, state);
    for (const r of rules) {
      if (!known(r.var)) continue;
      const at = next[r.var] ?? 0;
      next[r.var] =
        r.op === 'gain' || r.op === 'on'
          ? 1
          : r.op === 'lose' || r.op === 'off'
            ? 0
            : r.op === 'add'
              ? at + r.value
              : r.value;
    }
    return next;
  };

  const el = (tag: string, props: Record<string, string> = {}, text?: string) => {
    const node = document.createElement(tag);
    for (const k in props) node.setAttribute(k, props[k]!);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label: string, className: string, onClick: () => void) => {
    const b = el('button', { type: 'button', class: className }, label) as HTMLButtonElement;
    b.addEventListener('click', onClick);
    return b;
  };
  const picture = (src: string | null) => (src ? el('img', { src, alt: '' }) : null);

  /** Where the reader has been: each step's passage and the state on arriving. */
  let steps: { id: string; state: State }[] = [];

  const show = (nodes: (Node | null)[]) => {
    root.replaceChildren(...nodes.filter((n): n is Node => n !== null));
    window.scrollTo(0, 0);
  };

  function cover() {
    const start = story.start;
    show([
      picture(story.cover),
      el('h1', {}, story.title),
      story.blurb ? el('p', { class: 'muted' }, story.blurb) : null,
      start
        ? button('Begin', 'start', () => {
            steps = [{ id: start, state: startState() }];
            page();
          })
        : el('p', { class: 'muted' }, 'This story has no first passage yet.'),
    ]);
  }

  function page() {
    const step = steps[steps.length - 1]!;
    const p = story.passages[step.id];
    if (!p) return cover();
    const prose = el('div');
    prose.innerHTML = p.html;
    const lines = p.lines
      .filter((l) => !l.when || meets(step.state, l.when))
      .map((l) => el('p', {}, l.text));
    const nodes: (Node | null)[] = [
      steps.length > 1
        ? button('← Back a step', 'quiet', () => {
            steps.pop();
            page();
          })
        : null,
      picture(p.art),
      el('h2', {}, p.title),
      prose,
      ...lines,
    ];
    if (p.ending) {
      const end = el('section', { class: 'ending' });
      end.append(
        el('div', { class: 'label' }, 'The end'),
        el('h2', {}, p.ending),
        button('Start over', 'start', cover),
      );
      nodes.push(end);
    } else {
      const list = el('ul', { class: 'choices' });
      for (const c of p.choices) {
        const unmet = c.needs.filter((r) => !meets(step.state, r));
        const open = unmet.length === 0;
        const to = c.to;
        const b = button(c.label, 'choice', () => {
          if (!to || !open) return;
          steps.push({ id: to, state: apply(step.state, c.does) });
          page();
        });
        if (!to || !open) {
          b.disabled = true;
          b.append(
            el(
              'small',
              {},
              !to ? 'This path isn’t written yet' : `Needs: ${unmet.map((r) => r.text).join(', ')}`,
            ),
          );
        }
        const li = el('li');
        li.append(b);
        list.append(li);
      }
      nodes.push(
        p.choices.length ? list : el('p', { class: 'muted' }, 'The path ends here, for now.'),
      );
    }
    show(nodes);
  }

  document.title = story.title;
  cover();
}
