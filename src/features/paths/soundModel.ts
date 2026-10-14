import type { Entry } from '../../data/types';
import { removedField, updateEntry } from '../../lib/entries/entries';

/**
 * Ambient sound: a passage can set the sound that plays under it
 * (`fields.sound`), made in the browser (ambience.ts), so there are no files
 * to upload. A passage without one keeps whatever was playing, so a writer
 * sets the rain once and it carries on until a passage changes it, or asks
 * for silence. Readers turn sound on themselves; it starts off.
 */

export const AMBIENCES = [
  { key: 'rain', label: 'Rain' },
  { key: 'wind', label: 'Wind' },
  { key: 'sea', label: 'The sea' },
  { key: 'fire', label: 'A crackling fire' },
  { key: 'night', label: 'Night insects' },
  { key: 'drone', label: 'An eerie hum' },
  { key: 'heartbeat', label: 'A heartbeat' },
] as const;
export type Ambience = (typeof AMBIENCES)[number]['key'];

/** What a passage asks for: an ambience, or silence. */
export type PassageSound = Ambience | 'silence';

const isAmbience = (v: unknown): v is Ambience => AMBIENCES.some((a) => a.key === v);

/** The passage's own sound, or null if it keeps what was playing. */
export function soundOf(passage: Pick<Entry, 'fields'>): PassageSound | null {
  const s = passage.fields.sound;
  return s === 'silence' || isAmbience(s) ? s : null;
}

/** What plays at the end of a route: the last passage along it that set a sound. */
export function soundAlong(
  path: string[],
  passages: Map<string, Pick<Entry, 'fields'>>,
): Ambience | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const p = passages.get(path[i]!);
    const s = p ? soundOf(p) : null;
    if (s) return s === 'silence' ? null : s;
  }
  return null;
}

export const ambienceLabel = (key: Ambience): string => AMBIENCES.find((a) => a.key === key)!.label;

export const setSound = (ws: string, passageId: string, sound: PassageSound | null) =>
  updateEntry(ws, passageId, {}, { sound: sound ?? removedField() });
