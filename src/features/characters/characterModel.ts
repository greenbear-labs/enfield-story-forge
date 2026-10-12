import type { Entry, FieldValue } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { matchesQuery } from '../../lib/entries/model';

/**
 * A field's path inside `fields`. Module fields are nested one level, e.g.
 * "arc.lie", which is also the dotted key `updateEntry` takes to change it.
 */
export type FieldPath = string;

export interface FieldDef {
  path: FieldPath;
  label: string;
  placeholder: string;
  /** A long answer gets a textarea. */
  long?: boolean;
}

/** Story roles offered as suggestions. The role is free text, so anything goes. */
export const ROLE_SUGGESTIONS = [
  'Protagonist',
  'Antagonist',
  'Deuteragonist',
  'Love interest',
  'Mentor',
  'Sidekick',
  'Ally',
  'Rival',
  'Foil',
  'Trickster',
  'Supporting',
  'Minor',
];

/** The core card: the same everywhere a character appears. The name is the entry title. */
export const CORE_FIELDS: FieldDef[] = [
  { path: 'role', label: 'Role', placeholder: 'e.g. Protagonist, mentor, rival' },
  { path: 'want', label: 'Want', placeholder: 'What they’re chasing' },
  { path: 'need', label: 'Need', placeholder: 'What would actually make them whole' },
  { path: 'flaw', label: 'Flaw', placeholder: 'What keeps getting in their way' },
];

export const ARC_TYPES = [
  { key: 'positive', label: 'Positive', hint: 'They let go of the lie and embrace the truth.' },
  { key: 'flat', label: 'Flat', hint: 'They already know the truth and change the world.' },
  { key: 'negative', label: 'Negative', hint: 'They cling to the lie, or fall for a worse one.' },
] as const;

export interface ModuleDef {
  key: string;
  title: string;
  blurb: string;
  fields: FieldDef[];
}

/** Add-on modules. Each is collapsed until opened, with a count of what's filled in. */
export const CHARACTER_MODULES: ModuleDef[] = [
  {
    key: 'arc',
    title: 'Arc',
    blurb: 'The lie they believe, the truth they need, and how far they travel.',
    fields: [
      { path: 'arc.lie', label: 'The lie', placeholder: 'What they believe that isn’t true' },
      { path: 'arc.truth', label: 'The truth', placeholder: 'What they have to learn' },
      { path: 'arc.start', label: 'Where they start', placeholder: 'Who they are on page one' },
      { path: 'arc.end', label: 'Where they end', placeholder: 'Who they are on the last page' },
    ],
  },
  {
    key: 'backstory',
    title: 'Backstory',
    blurb: 'Where they come from and what still hurts.',
    fields: [
      {
        path: 'backstory.wound',
        label: 'The wound',
        placeholder: 'What happened that still hurts',
      },
      {
        path: 'backstory.secret',
        label: 'A secret',
        placeholder: 'What they’ve never told anyone',
      },
      {
        path: 'backstory.history',
        label: 'History',
        placeholder: 'Family, home, the years before the story starts',
        long: true,
      },
    ],
  },
  {
    key: 'look',
    title: 'Appearance and voice',
    blurb: 'How they look, move, and sound.',
    fields: [
      { path: 'look.appearance', label: 'Appearance', placeholder: 'What people notice first' },
      { path: 'look.mannerisms', label: 'Mannerisms', placeholder: 'Habits, tics, how they move' },
      { path: 'look.voice', label: 'Voice', placeholder: 'How they talk: rhythm, words, tone' },
      {
        path: 'look.line',
        label: 'A line they’d say',
        placeholder: '“Don’t thank me. Just run.”',
      },
    ],
  },
];

/** A question in the Character Interview. Its answer fills `path` on the card. */
export interface InterviewQuestion {
  question: string;
  path: FieldPath;
  /** Shown with the answer on the character page, for questions that aren't on the card. */
  label?: string;
}

/** Asked in order, one at a time. Answers land on the card or in the Interview module. */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  { question: 'What do you want more than anything right now?', path: 'want' },
  { question: 'What do you actually need, even if you don’t know it yet?', path: 'need' },
  { question: 'What flaw keeps getting you into trouble?', path: 'flaw' },
  { question: 'What happened to you that still hurts?', path: 'backstory.wound' },
  { question: 'What do you believe about the world that isn’t quite true?', path: 'arc.lie' },
  { question: 'What would you have to learn to let that belief go?', path: 'arc.truth' },
  { question: 'What’s a secret you’ve never told anyone?', path: 'backstory.secret' },
  { question: 'Where did you grow up, and who raised you?', path: 'backstory.history' },
  { question: 'What do people notice first when they meet you?', path: 'look.appearance' },
  { question: 'What’s a habit you can’t shake?', path: 'look.mannerisms' },
  { question: 'Say something the way you would when you’re nervous.', path: 'look.line' },
  { question: 'What are you most afraid of?', path: 'interview.fear', label: 'Most afraid of' },
  {
    question: 'Who would you protect at any cost?',
    path: 'interview.protect',
    label: 'Would protect at any cost',
  },
  {
    question: 'What would make you betray someone you love?',
    path: 'interview.betray',
    label: 'Would betray someone for',
  },
  {
    question: 'What do you do on a perfect day off?',
    path: 'interview.dayOff',
    label: 'A perfect day off',
  },
  {
    question: 'How do you want to be remembered?',
    path: 'interview.remembered',
    label: 'Wants to be remembered as',
  },
];

/** Interview answers that don't belong to a card field, shown in their own module. */
export const INTERVIEW_ONLY = INTERVIEW_QUESTIONS.filter((q) => q.label);

/** The text at a field path, or '' if there's none. */
export function fieldText(entry: Pick<Entry, 'fields'>, path: FieldPath): string {
  let value: FieldValue | undefined = entry.fields;
  for (const key of path.split('.')) {
    value =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, FieldValue>)[key]
        : undefined;
  }
  return typeof value === 'string' ? value : '';
}

/** How many of the fields have something in them. */
export const filledCount = (entry: Pick<Entry, 'fields'>, fields: { path: FieldPath }[]) =>
  fields.filter((f) => fieldText(entry, f.path).trim()).length;

/** Every filled-in card, module, and interview field, as [label, text], in card order. */
export function characterSummary(entry: Pick<Entry, 'fields'>): [string, string][] {
  const arcType = ARC_TYPES.find((a) => a.key === fieldText(entry, 'arc.type'));
  const defs: { path: FieldPath; label: string }[] = [
    ...CORE_FIELDS,
    ...CHARACTER_MODULES.flatMap((m) => m.fields),
    ...INTERVIEW_ONLY.map((q) => ({ path: q.path, label: q.label! })),
  ];
  const rows = defs.flatMap((d): [string, string][] => {
    const value = fieldText(entry, d.path).trim();
    return value ? [[d.label, value]] : [];
  });
  return arcType ? [...rows, ['Arc type', arcType.label]] : rows;
}

export const characterRole = (e: Entry) => fieldText(e, 'role');
export const characterNotes = (e: Entry) => fieldText(e, 'notes');

/** Relationship notes by the other character's id. */
export function relationNotes(e: Entry): Record<string, string> {
  const raw = e.fields.relations;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

export interface CharacterInput {
  name?: string;
  /** Values by field path, e.g. { role: 'Mentor', 'backstory.wound': '…' }. */
  values?: Record<FieldPath, string>;
  notes?: string;
  /** Shards it came from. */
  sourceIds?: string[];
}

/** Turns dotted paths into the nested `fields` map. Blank values are left out. */
export function fieldsFromValues(values: Record<FieldPath, string>): Record<string, FieldValue> {
  const fields: Record<string, FieldValue> = {};
  for (const [path, raw] of Object.entries(values)) {
    const value = raw.trim();
    if (!value) continue;
    const keys = path.split('.');
    let target = fields;
    for (const key of keys.slice(0, -1)) {
      const next = target[key];
      target = (
        next && typeof next === 'object' && !Array.isArray(next) ? next : (target[key] = {})
      ) as Record<string, FieldValue>;
    }
    target[keys[keys.length - 1]!] = value;
  }
  return fields;
}

export function createCharacter(workspaceId: string, input: CharacterInput): string {
  const fields = fieldsFromValues(input.values ?? {});
  if (input.notes?.trim()) fields.notes = input.notes.trim();
  const id = createEntry(workspaceId, {
    type: 'character',
    title: input.name?.trim() || 'Unnamed character',
    fields,
  });
  for (const sourceId of input.sourceIds ?? []) addLink(workspaceId, id, 'source', sourceId);
  return id;
}

const byName = (a: Entry, b: Entry) =>
  (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });

/** The cast, filtered by a search and sorted by name. */
export function filterCast(characters: Entry[], query: string): Entry[] {
  return characters.filter((c) => matchesQuery(c, query)).sort(byName);
}
