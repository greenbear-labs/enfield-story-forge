import { doc, getDoc } from 'firebase/firestore';
import type { Entry } from '../../data/types';
import {
  playableHtml,
  storyFile,
  storyFileName,
  twineArchive,
} from '../../features/paths/exportModel';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';
import { downloadFile } from './exportData';
import { coverUrlOf } from './publish';

/**
 * Downloads an adventure as a file: one HTML file that plays it, or a Twine 2
 * archive. Reads each passage's prose (from the cache when offline).
 */

type Source = Pick<Entry, 'id' | 'title' | 'fields' | 'images' | 'coverImageId'>;

async function readBodies(ws: string, passages: Source[]): Promise<Map<string, unknown>> {
  const { db } = getFirebase();
  const docs = await Promise.all(
    passages.map((p) =>
      getDoc(doc(db, paths.body(ws, p.id)))
        .then((b) => b.data()?.doc as unknown)
        .catch(() => null),
    ),
  );
  return new Map(passages.map((p, i) => [p.id, docs[i]]));
}

/** A picture as a data URL, so the file works offline; its web address if it can't be read. */
async function embedded(url: string): Promise<string> {
  const absolute = new URL(url, window.location.origin).href;
  try {
    const res = await fetch(absolute);
    if (!res.ok) return absolute;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : absolute);
      reader.onerror = () => resolve(absolute);
      reader.readAsDataURL(blob);
    });
  } catch {
    return absolute;
  }
}

export async function downloadPlayable(ws: string, adventure: Source, passages: Source[]) {
  const all = [adventure, ...passages];
  const [bodies, urls] = await Promise.all([
    readBodies(ws, passages),
    Promise.all(all.map((e) => coverUrlOf(e).then((u) => (u ? embedded(u) : null)))),
  ]);
  const art = new Map(all.map((e, i) => [e.id, urls[i] ?? null]));
  const story = storyFile(adventure, passages, bodies, (e) => art.get(e.id) ?? null);
  downloadFile(storyFileName(story.title, '.html'), playableHtml(story), 'text/html');
}

export async function downloadTwine(ws: string, adventure: Source, passages: Source[]) {
  const bodies = await readBodies(ws, passages);
  downloadFile(
    storyFileName(adventure.title.trim() || 'adventure', '-twine.html'),
    twineArchive(adventure, passages, bodies),
    'text/html',
  );
}
