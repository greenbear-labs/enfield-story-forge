import type { Entry } from '../../data/types';
import { escapeXml, proseText, proseToHtml } from '../../lib/entries/prose';
import {
  adventureBlurb,
  choicesOf,
  endingLabel,
  endingOf,
  passageName,
  posOf,
  startIdOf,
  type EndingType,
} from './pathsModel';
import { condText, linesOf, storyVars, type Cond, type Effect, type StoryVar } from './stateModel';
import { runStory, type StoryFile } from './storyFilePlayer';

/**
 * Taking an adventure out of Shadow Paths: as one HTML file anyone can open
 * and play in a browser (no account, no connection), or as a Twine 2 story
 * (Harlowe 3) to keep working on in Twine.
 */

type Source = Pick<Entry, 'id' | 'title' | 'fields'>;

const rule = (r: Cond | Effect) => ({ var: r.var, op: r.op, value: r.value });

/**
 * The story as plain data for the playable file. `artOf` gives each entry's
 * picture (a data URL or a web address), or null.
 */
export function storyFile(
  adventure: Source,
  passages: Source[],
  bodies: Map<string, unknown>,
  artOf: (entry: Source) => string | null,
): StoryFile {
  const vars = storyVars(adventure);
  const known = new Set(passages.map((p) => p.id));
  const start = startIdOf(adventure);
  return {
    title: adventure.title.trim() || 'Untitled adventure',
    blurb: adventureBlurb(adventure),
    cover: artOf(adventure),
    start: start && known.has(start) ? start : null,
    vars: vars.map((v) => ({ id: v.id, kind: v.kind, start: v.start })),
    passages: Object.fromEntries(
      passages.map((p) => {
        const ending = endingOf(p);
        return [
          p.id,
          {
            title: passageName(p),
            html: proseToHtml(bodies.get(p.id)),
            art: artOf(p),
            ending: ending ? endingLabel(ending) : null,
            lines: linesOf(p)
              .filter((l) => l.text.trim())
              .map((l) => ({ text: l.text, when: l.when ? rule(l.when) : null })),
            choices: ending
              ? []
              : choicesOf(p).map((c) => ({
                  label: c.label.trim() || 'Go on',
                  to: c.to && known.has(c.to) ? c.to : null,
                  needs: c.requires.map((r) => ({ ...rule(r), text: condText(r, vars) })),
                  does: c.effects.map(rule),
                })),
          },
        ];
      }),
    ),
  };
}

/** Keeps the data from closing the script tag it sits in. */
const scriptJson = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, ' ');

/** One HTML file that plays the story by itself. */
export function playableHtml(story: StoryFile): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Enfield Shadow Paths">
<title>${escapeXml(story.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main id="story"></main>
<footer>Made with Enfield Shadow Paths</footer>
<script>
(${runStory.toString()})(${scriptJson(story)}, document.getElementById('story'));
</script>
</body>
</html>
`;
}

// The file's own colours: it's always night, like Shadow Paths.
const STYLE = `
:root { --bg:#0a1211; --surface:#111c1a; --ink:#ece4cf; --muted:#a3b2aa; --line:#26352f; --gold:#e7b04e; --gold-soft:#2d2513; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; min-height:100vh; background:radial-gradient(ellipse at top, #15302b, var(--bg) 60%) var(--bg); color:var(--ink); font:1.1rem/1.65 Georgia, 'Times New Roman', serif; }
main { max-width:680px; margin:0 auto; padding:24px 16px 48px; display:flex; flex-direction:column; gap:18px; }
h1, h2 { font-weight:normal; line-height:1.2; margin:0; }
h1 { font-size:2.2rem; } h2 { font-size:1.7rem; }
p { margin:0 0 .8em; }
img { width:100%; aspect-ratio:3/2; object-fit:cover; border-radius:14px; border:1px solid var(--line); }
button { font:inherit; color:inherit; cursor:pointer; }
.choices { display:flex; flex-direction:column; gap:10px; list-style:none; padding:0; margin:0; }
.choice { width:100%; text-align:left; padding:12px 16px; border-radius:12px; border:1px solid var(--line); background:var(--surface); }
.choice:hover:not(:disabled) { border-color:var(--gold); }
.choice::before { content:'❯ '; color:var(--gold); }
.choice:disabled { opacity:.6; cursor:default; }
.choice small { display:block; color:var(--muted); font-size:.85rem; }
.start { align-self:flex-start; padding:10px 22px; border-radius:999px; border:0; background:var(--gold); color:#1b1306; }
.quiet { align-self:flex-start; padding:4px 0; border:0; background:none; color:var(--muted); font-size:.9rem; }
.ending { padding:16px; border-radius:14px; border:1px solid var(--gold); background:var(--gold-soft); text-align:center; }
.label { color:var(--gold); font-size:.8rem; letter-spacing:.12em; text-transform:uppercase; }
.muted { color:var(--muted); }
footer { text-align:center; color:var(--muted); font-size:.8rem; padding-bottom:24px; }
`;

// ----- Twine -----

/** A Harlowe variable name for each of the story's things: `$lantern`. */
export function twineVarNames(vars: StoryVar[]): Map<string, string> {
  const used = new Set<string>();
  const names = new Map<string, string>();
  for (const v of vars) {
    const base =
      v.name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/^(\d)/, '_$1') || v.kind;
    let name = base;
    for (let i = 2; used.has(name); i++) name = `${base}_${i}`;
    used.add(name);
    names.set(v.id, `$${name}`);
  }
  return names;
}

/** Each passage's Twine name: its title, made unique. */
function twinePassageNames(passages: Source[]): Map<string, string> {
  const used = new Set<string>();
  const names = new Map<string, string>();
  for (const p of passages) {
    const base = passageName(p);
    let name = base;
    for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base} (${i})`;
    used.add(name.toLowerCase());
    names.set(p.id, name);
  }
  return names;
}

const str = (s: string) => JSON.stringify(s);

/** Text Harlowe would read as markup (or a variable) is printed as is. */
const harloweText = (text: string) =>
  /[$_[\]<>(){}`'"/*~^|\\]|''|\/\/|^\s*[-#=*>]/.test(text)
    ? `(verbatim-print: ${str(text)})`
    : text;

function harloweCond(c: Cond, names: Map<string, string>): string | null {
  const v = names.get(c.var);
  if (!v) return null;
  switch (c.op) {
    case 'has':
    case 'on':
      return `${v} is true`;
    case 'lacks':
    case 'off':
      return `${v} is false`;
    case 'atLeast':
      return `${v} >= ${c.value}`;
    case 'atMost':
      return `${v} <= ${c.value}`;
    case 'exactly':
      return `${v} is ${c.value}`;
  }
}

function harloweEffect(e: Effect, names: Map<string, string>): string | null {
  const v = names.get(e.var);
  if (!v) return null;
  const to =
    e.op === 'gain' || e.op === 'on'
      ? 'true'
      : e.op === 'lose' || e.op === 'off'
        ? 'false'
        : e.op === 'add'
          ? `it + ${e.value}`
          : `${e.value}`;
  return `(set: ${v} to ${to})`;
}

const all = (conds: (string | null)[]) => conds.filter(Boolean).join(' and ');

/** A passage's text in Harlowe: its prose, its lines, its choices. */
export function harlowePassage(
  passage: Source,
  body: unknown,
  vars: StoryVar[],
  varNames: Map<string, string>,
  passageNames: Map<string, string>,
): string {
  const out: string[] = proseText(body)
    .split(/\n{2,}/)
    .filter((t) => t.trim())
    .map((t) => t.split('\n').map(harloweText).join('\n'));
  for (const line of linesOf(passage)) {
    if (!line.text.trim()) continue;
    const when = line.when ? harloweCond(line.when, varNames) : null;
    out.push(when ? `(if: ${when})[${harloweText(line.text)}]` : harloweText(line.text));
  }
  const ending = endingOf(passage);
  if (ending) {
    out.push(`''The end: ${endingLabel(ending)}''`);
    return out.join('\n\n');
  }
  const choices: string[] = [];
  for (const c of choicesOf(passage)) {
    const target = c.to ? passageNames.get(c.to) : undefined;
    if (!target) continue;
    const label = str(c.label.trim() || 'Go on');
    const sets = c.effects.map((e) => harloweEffect(e, varNames)).filter(Boolean);
    const link = sets.length
      ? `(link: ${label})[${sets.join('')}(go-to: ${str(target)})]`
      : `(link-goto: ${label}, ${str(target)})`;
    const needs = all(c.requires.map((r) => harloweCond(r, varNames)));
    choices.push(
      needs
        ? `(if: ${needs})[${link}](else:)[(verbatim-print: ${str(
            `${c.label.trim() || 'Go on'} (needs ${c.requires.map((r) => condText(r, vars)).join(', ')})`,
          )})]`
        : link,
    );
  }
  if (choices.length) out.push(choices.join('\n'));
  return out.join('\n\n');
}

/** A stable IFID (Twine's story id, a UUID) from the adventure's id. */
export function twineIfid(id: string): string {
  let hex = '';
  for (let seed = 0; hex.length < 32; seed++) {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
    hex += (h >>> 0).toString(16).padStart(8, '0');
  }
  const u = hex.slice(0, 32).toUpperCase().split('');
  u[12] = '4';
  u[16] = '89AB'[parseInt(u[16]!, 16) % 4]!;
  const s = u.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const attr = escapeXml;

/**
 * The story as a Twine 2 archive (Harlowe 3), which Twine opens with
 * Library › Import. Items and flags become true/false variables, counters
 * numbers, set in a `startup` passage; endings are tagged.
 */
export function twineArchive(
  adventure: Source,
  passages: Source[],
  bodies: Map<string, unknown>,
): string {
  const vars = storyVars(adventure);
  const varNames = twineVarNames(vars);
  const passageNames = twinePassageNames(passages);
  const start = startIdOf(adventure);
  const pos = passages.map(posOf);
  const minX = Math.min(0, ...pos.map((p) => p.x));
  const minY = Math.min(0, ...pos.map((p) => p.y));

  const rows = passages.map((p, i) => {
    const ending: EndingType | null = endingOf(p);
    const tags = ending ? `ending ending-${ending}` : '';
    const at = `${Math.round(pos[i]!.x - minX + 100)},${Math.round(pos[i]!.y - minY + 100)}`;
    const text = harlowePassage(p, bodies.get(p.id), vars, varNames, passageNames);
    return { pid: i + 1, name: passageNames.get(p.id)!, tags, at, text };
  });
  if (vars.length)
    rows.push({
      pid: rows.length + 1,
      name: 'Story state',
      tags: 'startup',
      at: '100,0',
      text: vars
        .map((v) => `(set: ${varNames.get(v.id)} to ${v.kind === 'counter' ? v.start : 'false'})`)
        .join('\n'),
    });
  const startPid = start ? passages.findIndex((p) => p.id === start) + 1 : 1;

  const title = adventure.title.trim() || 'Untitled adventure';
  return `<tw-storydata name="${attr(title)}" startnode="${Math.max(1, startPid)}" creator="Enfield Shadow Paths" creator-version="1.0" format="Harlowe" format-version="3.3.9" ifid="${twineIfid(adventure.id)}" options="" tags="" zoom="1" hidden><style role="stylesheet" id="twine-user-stylesheet" type="text/twine-css"></style><script role="script" id="twine-user-script" type="text/twine-javascript"></script>${rows
    .map(
      (r) =>
        `<tw-passagedata pid="${r.pid}" name="${attr(r.name)}" tags="${attr(r.tags)}" position="${r.at}" size="100,100">${escapeXml(r.text)}</tw-passagedata>`,
    )
    .join('')}</tw-storydata>
`;
}

/** A file name from the story's title. */
export const storyFileName = (title: string, ext: string) =>
  `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'adventure'
  }${ext}`;
