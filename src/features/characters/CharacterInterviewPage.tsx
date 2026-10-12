import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { createCharacter, fieldText, filterCast, INTERVIEW_QUESTIONS } from './characterModel';

/** One question at a time. Each answer lands on the character’s card as you go. */
export function CharacterInterviewPage({ characterId }: { characterId?: string }) {
  return (
    <div data-sec="char" className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Link
        to="/characters"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Character Center
      </Link>
      <header className="sthead !grid-cols-[auto_1fr] max-sm:!grid-cols-1">
        <div className="badge">
          <Icon name="chat" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Character Center tool</div>
          <h1>Character Interview</h1>
          <p className="mt-1 max-w-[62ch]">
            Ask, then answer in their voice. Skip anything that doesn’t fit. Every answer is saved
            to their card as you go.
          </p>
        </div>
      </header>
      {characterId ? <Interview characterId={characterId} /> : <ChooseCharacter />}
    </div>
  );
}

function ChooseCharacter() {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const cast = useEntries('character');
  const sorted = useMemo(() => filterCast(cast.data ?? [], ''), [cast.data]);
  const [name, setName] = useState('');

  const start = (id: string) =>
    void navigate({ to: '/characters/interview', search: { character: id }, replace: true });

  const startNew = (e: FormEvent) => {
    e.preventDefault();
    if (!ws || !name.trim()) return;
    start(createCharacter(ws, { name }));
  };

  return (
    <section className="panel flex flex-col gap-4">
      <h2 className="text-[1.1rem]">Who are you interviewing?</h2>
      <form className="flex flex-wrap items-center gap-2" onSubmit={startNew}>
        <label className="min-w-[200px] flex-1">
          <span className="sr-only">New character’s name</span>
          <input
            className="txt"
            placeholder="Someone new: their name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Start the interview
        </button>
      </form>
      {cast.data === undefined ? (
        <Loading />
      ) : (
        sorted.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="label">Or someone from the cast</span>
            <div className="flex flex-wrap gap-1.5">
              {sorted.map((c) => (
                <button key={c.id} type="button" className="seg" onClick={() => start(c.id)}>
                  {c.title || 'Unnamed character'}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </section>
  );
}

function Interview({ characterId }: { characterId: string }) {
  const character = useEntry(characterId);
  if (character.data === undefined)
    return character.error ? (
      <EmptyState>Couldn’t load this character. Check your connection and reload.</EmptyState>
    ) : (
      <Loading />
    );
  if (!character.data || character.data.deletedAt)
    return (
      <EmptyState>
        This character isn’t in your cast anymore.{' '}
        <Link to="/characters/interview" className="text-accent underline">
          Interview someone else
        </Link>
      </EmptyState>
    );
  // Keyed so answers start from this character's saved card.
  return <Questions key={character.data.id} character={character.data} />;
}

function Questions({ character }: { character: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const saved = useMemo(
    () => INTERVIEW_QUESTIONS.map((q) => fieldText(character, q.path)),
    // Only the card as it was when the interview started; later saves are our own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [answers, setAnswers] = useState(saved);
  const [index, setIndex] = useState(() => {
    const first = saved.findIndex((a) => !a.trim());
    return first === -1 ? 0 : first;
  });
  const [stored, setStored] = useState(saved);
  const question = INTERVIEW_QUESTIONS[index]!;
  const last = index === INTERVIEW_QUESTIONS.length - 1;
  const name = character.title || 'They';

  const saveCurrent = () => {
    const answer = answers[index]!.trim();
    if (answer === stored[index]!.trim()) return;
    updateEntry(ws, character.id, {}, { [question.path]: answer });
    setStored((s) => s.map((v, i) => (i === index ? answer : v)));
  };

  const finish = () => {
    saveCurrent();
    toast(`Interview saved to ${name}’s card.`);
    void navigate({ to: '/characters/$characterId', params: { characterId: character.id } });
  };

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    if (last) return finish();
    saveCurrent();
    setIndex(index + 1);
  };

  return (
    <form
      className="panel flex flex-col gap-4 border-t-4 border-t-accent"
      onSubmit={next}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) next();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label">
          Interviewing{' '}
          <Link
            to="/characters/$characterId"
            params={{ characterId: character.id }}
            className="text-accent hover:underline"
          >
            {character.title || 'Unnamed character'}
          </Link>
        </span>
        <span className="text-[0.8rem] text-muted">
          Question {index + 1} of {INTERVIEW_QUESTIONS.length}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-label="Interview progress"
        aria-valuemin={1}
        aria-valuemax={INTERVIEW_QUESTIONS.length}
        aria-valuenow={index + 1}
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${((index + 1) / INTERVIEW_QUESTIONS.length) * 100}%` }}
        />
      </div>
      <label className="flex flex-col gap-2">
        <span className="font-display text-[1.35rem] leading-snug max-sm:text-[1.2rem]">
          {question.question}
        </span>
        <textarea
          key={index}
          autoFocus
          className="txt min-h-28 text-[1.05rem]"
          placeholder={`Answer as ${name} would…`}
          value={answers[index]}
          onChange={(e) => setAnswers((a) => a.map((v, i) => (i === index ? e.target.value : v)))}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn"
          disabled={index === 0}
          onClick={() => {
            saveCurrent();
            setIndex(index - 1);
          }}
        >
          Back
        </button>
        {!last && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setAnswers((a) => a.map((v, i) => (i === index ? stored[index]! : v)));
              setIndex(index + 1);
            }}
          >
            Skip
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {last ? 'Finish' : 'Next'}
        </button>
        <span className="text-[0.78rem] text-muted max-sm:hidden">Ctrl + Enter for next</span>
        {!last && (
          <button type="button" className="btn btn-ghost ml-auto" onClick={finish}>
            Stop here
          </button>
        )}
      </div>
    </form>
  );
}
