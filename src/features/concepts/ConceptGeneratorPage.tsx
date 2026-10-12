import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { useAuthStore } from '../auth/authStore';
import { createConcept } from './conceptModel';
import {
  conceptSentence,
  dealAll,
  fillPicks,
  isComplete,
  sample,
  VISIBLE_OPTIONS,
} from './generator';
import { GENERATOR_COLUMNS, type ColumnKey, type Picks } from './generatorPools';

/** Click one box per column and a concept sentence builds itself. Picks stay put on re-roll. */
export function ConceptGeneratorPage() {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Picks>({});
  const [shown, setShown] = useState(() => dealAll());
  const [name, setName] = useState('');
  const sentence = conceptSentence(picks);
  const complete = isComplete(picks);

  const toggle = (key: ColumnKey, option: string) =>
    setPicks((p) => ({ ...p, [key]: p[key] === option ? undefined : option }));

  const rerollColumn = (key: ColumnKey) => {
    const column = GENERATOR_COLUMNS.find((c) => c.key === key)!;
    setShown((s) => ({
      ...s,
      [key]: sample(column.options, VISIBLE_OPTIONS, Math.random, picks[key]),
    }));
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!ws || !complete) return;
    const parts = Object.fromEntries(
      Object.entries(picks).filter((entry): entry is [string, string] => !!entry[1]),
    );
    const id = createConcept(ws, { title: name, logline: sentence, parts });
    toast('Saved to the Concept Bank.');
    void navigate({ to: '/concepts/$conceptId', params: { conceptId: id } });
  };

  return (
    <div data-sec="concept" className="flex flex-col gap-4">
      <Link
        to="/concepts"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Concepts
      </Link>
      <header className="sthead !grid-cols-[auto_1fr] max-sm:!grid-cols-1">
        <div className="badge">
          <Icon name="grid" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Concepts tool</div>
          <h1>Concept Generator</h1>
          <p className="mt-1 max-w-[62ch]">
            Click one box in each column and your concept sentence builds itself. The boxes you pick
            stay put when you re-roll. The twist is optional.
          </p>
        </div>
      </header>

      <section
        aria-label="Your concept"
        className="panel sticky top-[100px] z-10 flex flex-col gap-3 border-t-4 border-t-accent max-sm:static"
      >
        <p className="font-display text-[1.2rem] leading-snug" aria-live="polite">
          {sentence}
        </p>
        <form className="flex flex-wrap items-center gap-2" onSubmit={save}>
          <label className="min-w-[200px] flex-1">
            <span className="sr-only">Concept name</span>
            <input
              className="txt"
              placeholder="Name it (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!complete}>
            Save to the Concept Bank
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setPicks(fillPicks(shown, picks))}
          >
            <Icon name="spark" size={14} /> Fill the rest
          </button>
          <button type="button" className="btn btn-small" onClick={() => setShown(dealAll(picks))}>
            <Icon name="dice" size={14} /> Re-roll everything
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={Object.values(picks).every((v) => !v)}
            onClick={() => setPicks({})}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-ai btn-small ml-auto"
            onClick={() => toast('AI options arrive in a later version.')}
          >
            Fresh options with AI
          </button>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {GENERATOR_COLUMNS.map((column) => (
          <section
            key={column.key}
            aria-label={column.label}
            className="flex min-w-0 flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-1">
              <h2 className="label">
                {column.label}
                {'optional' in column && column.optional ? ' (optional)' : ''}
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={`Re-roll ${column.label}`}
                title={`Re-roll ${column.label}`}
                onClick={() => rerollColumn(column.key)}
              >
                <Icon name="dice" size={14} />
              </button>
            </div>
            {shown[column.key].map((option) => (
              <button
                key={option}
                type="button"
                className="gen-box"
                aria-pressed={picks[column.key] === option}
                onClick={() => toggle(column.key, option)}
              >
                {option}
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
