import type { Entry, Link } from '../../data/types';
import { structureByKey, type Structure } from '../outlines/structures';
import { chapterBeatKeys, childrenOf, sceneText, scenePov, words } from './deskModel';
import { breakdown, longestGap, plotlinesByScene } from './plotlineModel';

/**
 * Story health: pacing, point-of-view balance, and gentle checks on a
 * manuscript. Nothing here blocks the writer; the checks are things worth a look.
 */

export interface ChapterPace {
  chapter: Entry;
  n: number;
  words: number;
  /** Each scene's kind, in order: a scene (goal, conflict, outcome) or a sequel (reaction, decision). */
  kinds: ('scene' | 'sequel')[];
}

export interface PovShare {
  /** A character's id, or null for scenes with no point of view set. */
  id: string | null;
  name: string;
  scenes: number;
  words: number;
}

export type CheckKind = 'empty' | 'long' | 'quiet' | 'unused' | 'vanish' | 'no-pov';

export interface Check {
  kind: CheckKind;
  text: string;
  /** The chapter to open to look into it, if there's one place to go. */
  chapterId?: string;
}

export interface Health {
  chapters: ChapterPace[];
  /** Average words per chapter that has any writing. */
  average: number;
  pov: PovShare[];
  checks: Check[];
}

export const chapterName = (chapter: Entry, n: number) => {
  const title = chapter.title.trim();
  return !title || /^chapter\s+\d+$/i.test(title) ? `Chapter ${n}` : `Chapter ${n}, “${title}”`;
};

const listFormat = new Intl.ListFormat('en', { type: 'conjunction' });

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** How many chapters a thread or a character can be away before it's worth a look. */
export const quietLimit = (chapters: number) => Math.max(3, Math.ceil(chapters * 0.2));
export const vanishLimit = (chapters: number) => Math.max(5, Math.ceil(chapters * 0.25));

export function health(
  chapters: Entry[],
  scenes: Entry[] | undefined,
  plotlines: Entry[],
  characters: Map<string, Entry>,
  links: Link[] | undefined,
  /** The writer's own structures too, so their beats can be named. */
  structures: Structure[] = [],
): Health {
  const checks: Check[] = [];
  const paces: ChapterPace[] = chapters.map((chapter, i) => {
    const own = childrenOf(scenes, chapter.id);
    return {
      chapter,
      n: i + 1,
      words: own.reduce((sum, s) => sum + words(s), 0),
      kinds: own.map((s) => (sceneText(s, 'sceneType') === 'sequel' ? 'sequel' : 'scene')),
    };
  });
  const written = paces.filter((p) => p.words > 0);
  const average = written.length
    ? Math.round(written.reduce((sum, p) => sum + p.words, 0) / written.length)
    : 0;

  // Chapters with nothing in them yet, and the beats they were meant to carry.
  for (const p of paces) {
    if (p.kinds.length) continue;
    const key =
      typeof p.chapter.fields.structure === 'string' ? p.chapter.fields.structure : undefined;
    const structure = structures.find((s) => s.key === key) ?? structureByKey(key);
    const beats = chapterBeatKeys(p.chapter)
      .map((k) => structure.beats.find((b) => b.key === k)?.name)
      .filter(Boolean);
    checks.push({
      kind: 'empty',
      chapterId: p.chapter.id,
      text: beats.length
        ? `${chapterName(p.chapter, p.n)} has no scenes yet, though ${listFormat.format(beats as string[])} ${beats.length === 1 ? 'lands' : 'land'} there.`
        : `${chapterName(p.chapter, p.n)} has no scenes yet.`,
    });
  }

  // A chapter much longer than the rest (once there are enough to compare).
  if (written.length >= 3) {
    for (const p of written) {
      if (p.words < average * 1.6) continue;
      checks.push({
        kind: 'long',
        chapterId: p.chapter.id,
        text: `${chapterName(p.chapter, p.n)} runs long: ${plural(p.words, 'word')}, against an average of ${average.toLocaleString()}.`,
      });
    }
  }

  // Plotlines that go quiet for a stretch, or never appear.
  const ordered = chapters.flatMap((c) => childrenOf(scenes, c.id));
  const rows = breakdown(chapters, scenes, plotlines, plotlinesByScene(links));
  for (const row of rows) {
    if (!row.plotline) continue;
    const name = row.plotline.title || 'Untitled plotline';
    if (!row.chapters) {
      checks.push({ kind: 'unused', text: `The plotline “${name}” has no scenes yet.` });
      continue;
    }
    const gap = longestGap(row);
    if (gap >= quietLimit(chapters.length)) {
      checks.push({
        kind: 'quiet',
        text: `The plotline “${name}” goes quiet for ${plural(gap, 'chapter')} in a row.`,
      });
    }
  }

  // Characters who drop out of the story for a long stretch: as the point of view or @mentioned.
  const mentions = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    if (l.kind !== 'mention') continue;
    mentions.set(l.fromId, (mentions.get(l.fromId) ?? new Set()).add(l.toId));
  }
  const seenIn = new Map<string, number[]>();
  paces.forEach((p, i) => {
    for (const s of childrenOf(scenes, p.chapter.id)) {
      const who = new Set(mentions.get(s.id));
      const pov = scenePov(s);
      if (pov) who.add(pov);
      for (const id of who) {
        if (!characters.has(id)) continue;
        const list = seenIn.get(id) ?? [];
        if (list.at(-1) !== i) list.push(i);
        seenIn.set(id, list);
      }
    }
  });
  for (const [id, list] of seenIn) {
    let worst = { gap: 0, after: 0 };
    for (let k = 1; k < list.length; k++) {
      const gap = list[k]! - list[k - 1]! - 1;
      if (gap > worst.gap) worst = { gap, after: list[k - 1]! };
    }
    if (worst.gap < vanishLimit(chapters.length)) continue;
    const name = characters.get(id)!.title || 'Unnamed character';
    const after = paces[worst.after]!;
    checks.push({
      kind: 'vanish',
      chapterId: after.chapter.id,
      text: `${name} is missing for ${plural(worst.gap, 'chapter')} after ${chapterName(after.chapter, after.n)}.`,
    });
  }

  // Point of view: each character's share of the scenes and words.
  const shares = new Map<string | null, PovShare>();
  for (const s of ordered) {
    const pov = scenePov(s);
    const id = pov && characters.has(pov) ? pov : null;
    const share = shares.get(id) ?? {
      id,
      name: id ? characters.get(id)!.title || 'Unnamed character' : 'No point of view set',
      scenes: 0,
      words: 0,
    };
    share.scenes++;
    share.words += words(s);
    shares.set(id, share);
  }
  const unset = shares.get(null);
  if (unset && shares.size > 1) {
    checks.push({
      kind: 'no-pov',
      text: `${plural(unset.scenes, 'scene')} ${unset.scenes === 1 ? 'has' : 'have'} no point of view set, so the balance below leaves ${unset.scenes === 1 ? 'it' : 'them'} aside.`,
    });
  }
  const pov = [...shares.values()].sort(
    (a, b) =>
      Number(a.id === null) - Number(b.id === null) || b.words - a.words || b.scenes - a.scenes,
  );

  return { chapters: paces, average, pov, checks };
}
