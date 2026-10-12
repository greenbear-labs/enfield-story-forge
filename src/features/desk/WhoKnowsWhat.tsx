import { useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { chapterName } from './healthModel';
import {
  addSecret,
  ironies,
  removeSecret,
  secretsOf,
  setLearns,
  setSecretFact,
  START,
  type Secret,
} from './knowledgeModel';

const at = (n: number) => (n === 0 ? 'from the start' : `in Chapter ${n}`);

/** The secrets of a book, and when the reader and each character learn them. */
export function WhoKnowsWhat({
  book,
  chapters,
  people,
}: {
  book: Entry;
  chapters: Entry[];
  /** The characters to track: the book's cast and its POV characters. */
  people: Entry[];
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const secrets = secretsOf(book);
  const [fact, setFact] = useState('');
  const chapterIds = useMemo(() => chapters.map((c) => c.id), [chapters]);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!fact.trim()) return;
    addSecret(ws, book.id, fact);
    setFact('');
  };

  return (
    <section className="panel flex flex-col gap-3" aria-labelledby="knows-title">
      <div>
        <h2 id="knows-title" className="text-[1.05rem]">
          Who knows what
        </h2>
        <p className="text-[0.86rem] text-muted">
          List the secrets that matter, then mark when the reader and each character learn them.
          Where the reader knows first, you have dramatic irony.
        </p>
      </div>
      {secrets.length > 0 && (
        <ul className="flex flex-col gap-3">
          {secrets.map((s) => (
            <SecretCard
              key={s.id}
              book={book}
              secret={s}
              chapters={chapters}
              chapterIds={chapterIds}
              people={people}
            />
          ))}
        </ul>
      )}
      <form className="flex flex-wrap gap-2" onSubmit={add}>
        <label className="min-w-0 flex-1 basis-60">
          <span className="sr-only">A new secret</span>
          <input
            className="txt w-full"
            placeholder="A secret, e.g. Tom is the thief"
            value={fact}
            onChange={(e) => setFact(e.target.value)}
          />
        </label>
        <button type="submit" className="btn" disabled={!fact.trim()}>
          + Add a secret
        </button>
      </form>
    </section>
  );
}

function SecretCard({
  book,
  secret,
  chapters,
  chapterIds,
  people,
}: {
  book: Entry;
  secret: Secret;
  chapters: Entry[];
  chapterIds: string[];
  people: Entry[];
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const fact = useAutosaved(secret.fact, (v) => setSecretFact(ws, book.id, secret.id, v));
  const names = new Map(people.map((p) => [p.id, p.title || 'Unnamed character']));
  const ahead = ironies(secret, [...names.keys()], chapterIds);
  const options = (
    <>
      <option value="">Not yet</option>
      <option value={START}>From the start</option>
      {chapters.map((c, i) => (
        <option key={c.id} value={c.id}>
          {chapterName(c, i + 1)}
        </option>
      ))}
    </>
  );
  const pick = (who: string, label: string, value: string) => (
    <label key={who} className="flex min-w-0 flex-col gap-1 text-[0.85rem]">
      <span className="truncate">{label}</span>
      <select
        className="txt"
        value={chapterIds.includes(value) || value === START ? value : ''}
        onChange={(e) => setLearns(ws, book.id, secret.id, who, e.target.value)}
      >
        {options}
      </select>
    </label>
  );

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">The secret</span>
          <input
            className="w-full border-0 bg-transparent p-0 font-display text-[1.05rem] font-semibold outline-none"
            {...fact.props}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label={`Remove the secret “${secret.fact}”`}
          onClick={() => {
            const undo = removeSecret(ws, book.id, secret);
            toast('Secret removed.', { action: { label: 'Undo', onClick: undo } });
          }}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
        {pick('reader', 'The reader learns it', secret.reader)}
        {[...names].map(([id, name]) => pick(id, name, secret.learns[id] ?? ''))}
      </div>
      {ahead.length > 0 && (
        <p className="text-[0.84rem] text-muted">
          The reader knows {at(ahead[0]!.reader)}.{' '}
          {ahead
            .map(
              (a) =>
                `${names.get(a.characterId)} ${a.learns === Infinity ? 'never learns it, so far' : `learns it ${at(a.learns)}`}.`,
            )
            .join(' ')}
        </p>
      )}
    </li>
  );
}
