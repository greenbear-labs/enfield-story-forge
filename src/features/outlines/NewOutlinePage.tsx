import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { useEntries, useEntryMap } from '../../lib/entries/hooks';
import { newestFirst } from '../../lib/entries/model';
import { useAuthStore } from '../auth/authStore';
import { fieldText, filterCast } from '../characters/characterModel';
import { conceptLogline } from '../concepts/conceptModel';
import {
  createOutline,
  createSeries,
  FORMATS,
  START_METHODS,
  type Format,
  type StartMethod,
} from './outlineModel';
import { DEFAULT_STRUCTURE, STRUCTURES } from './structures';

interface Props {
  conceptId?: string;
  characterId?: string;
}

/** "How do you want to start?", then a name, a format, a series, and a structure. */
export function NewOutlinePage({ conceptId, characterId }: Props) {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const concepts = useEntries('concept');
  const characters = useEntries('character');
  const series = useEntries('series');
  const conceptsById = useEntryMap(concepts.data);
  const charactersById = useEntryMap(characters.data);

  const [method, setMethod] = useState<StartMethod>(
    conceptId ? 'concept' : characterId ? 'character' : 'theme',
  );
  const [pickedConcept, setPickedConcept] = useState(conceptId ?? '');
  const [pickedCharacter, setPickedCharacter] = useState(characterId ?? '');
  const [premise, setPremise] = useState('');
  const [theme, setTheme] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>('novel');
  const [seriesChoice, setSeriesChoice] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [structure, setStructure] = useState(DEFAULT_STRUCTURE);

  const concept = method === 'concept' ? conceptsById.get(pickedConcept) : undefined;
  const character = method === 'character' ? charactersById.get(pickedCharacter) : undefined;
  // The name follows the chosen concept until you type your own.
  const shownTitle = title ?? concept?.title ?? '';
  const conceptList = useMemo(() => [...(concepts.data ?? [])].sort(newestFirst), [concepts.data]);
  const cast = useMemo(() => filterCast(characters.data ?? [], ''), [characters.data]);
  const seriesList = useMemo(
    () => [...(series.data ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [series.data],
  );

  const ready =
    (method !== 'concept' || !!concept) &&
    (method !== 'character' || !!character) &&
    (seriesChoice !== 'new' || !!newSeries.trim());

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!ws || !ready) return;
    const spine: Record<string, string> = {};
    if (concept) spine.logline = conceptLogline(concept);
    if (method === 'premise') spine.logline = premise;
    if (method === 'theme') spine.themeQuestion = theme;
    if (character) {
      spine.want = fieldText(character, 'want');
      spine.need = fieldText(character, 'need');
      spine.lie = fieldText(character, 'arc.lie');
      spine.truth = fieldText(character, 'arc.truth');
    }
    const seriesId = seriesChoice === 'new' ? createSeries(ws, newSeries) : seriesChoice || null;
    const id = createOutline(ws, {
      title: shownTitle || (character ? `${character.title}’s story` : ''),
      format,
      structure,
      start: method,
      seriesId,
      spine,
      protagonistId: character?.id ?? null,
      conceptId: concept?.id ?? null,
    });
    toast('Outline started.');
    void navigate({ to: '/outlines/$outlineId', params: { outlineId: id } });
  };

  return (
    <form
      data-sec="story"
      className="mx-auto flex w-full max-w-[860px] flex-col gap-4"
      onSubmit={create}
    >
      <Link
        to="/outlines"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Outline Builder
      </Link>
      <header className="sthead !grid-cols-[auto_1fr] max-sm:!grid-cols-1">
        <div className="badge">
          <Icon name="plus" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Outline Builder tool</div>
          <h1>New Outline</h1>
          <p className="mt-1 max-w-[62ch]">
            Every way in leads to the same Story Spine, just in a different order. Nothing here is
            final; you can change all of it later.
          </p>
        </div>
      </header>

      <section className="panel flex flex-col gap-3" aria-labelledby="step-start">
        <h2 id="step-start" className="text-[1.1rem]">
          1. How do you want to start?
        </h2>
        <div
          role="group"
          aria-label="How do you want to start?"
          className="grid grid-cols-2 gap-2 max-sm:grid-cols-1"
        >
          {START_METHODS.map((m) => (
            <button
              key={m.key}
              type="button"
              className="gen-box flex flex-col gap-0.5"
              aria-pressed={method === m.key}
              onClick={() => setMethod(m.key)}
            >
              <span className="text-[0.95rem] font-semibold">{m.label}</span>
              <span className="text-[0.8rem] opacity-80">{m.hint}</span>
            </button>
          ))}
        </div>
        {method === 'concept' &&
          (conceptList.length === 0 ? (
            <p className="text-[0.9rem] text-muted">
              Your Concept Bank is empty.{' '}
              <Link to="/concepts" className="text-accent underline">
                Make a concept first
              </Link>
              , or pick another way in.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="flex flex-col gap-1">
                <span className="label">Concept</span>
                <select
                  className="txt"
                  value={pickedConcept}
                  onChange={(e) => setPickedConcept(e.target.value)}
                >
                  <option value="">Choose a concept…</option>
                  {conceptList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || 'Untitled concept'}
                    </option>
                  ))}
                </select>
              </label>
              {concept && conceptLogline(concept) && (
                <span className="text-[0.88rem] text-muted">{conceptLogline(concept)}</span>
              )}
            </div>
          ))}
        {method === 'character' &&
          (cast.length === 0 ? (
            <p className="text-[0.9rem] text-muted">
              Your cast is empty.{' '}
              <Link to="/characters" className="text-accent underline">
                Add a character first
              </Link>
              , or pick another way in.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="flex flex-col gap-1">
                <span className="label">Protagonist</span>
                <select
                  className="txt"
                  value={pickedCharacter}
                  onChange={(e) => setPickedCharacter(e.target.value)}
                >
                  <option value="">Choose a character…</option>
                  {cast.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || 'Unnamed character'}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-[0.82rem] text-muted">
                Their want, need, lie, and truth start the spine.
              </span>
            </div>
          ))}
        {method === 'premise' && (
          <label className="flex flex-col gap-1">
            <span className="label">Premise</span>
            <textarea
              className="txt min-h-16"
              placeholder="What if a lighthouse kept ships away on purpose?"
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
            />
          </label>
        )}
        {method === 'theme' && (
          <div className="flex flex-col gap-1">
            <label className="flex flex-col gap-1">
              <span className="label">Theme question</span>
              <input
                className="txt"
                placeholder="e.g. Is safety worth giving up freedom?"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </label>
            <p className="text-[0.82rem] text-muted">
              Next you’ll answer it, design the climax that proves the answer, and work back to the
              opening.
            </p>
          </div>
        )}
      </section>

      <section className="panel flex flex-col gap-3" aria-labelledby="step-name">
        <h2 id="step-name" className="text-[1.1rem]">
          2. Name it
        </h2>
        <label className="flex flex-col gap-1">
          <span className="label">Working title</span>
          <input
            className="txt"
            placeholder="Untitled story"
            value={shownTitle}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="label">Format</span>
          <div role="group" aria-label="Format" className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="seg"
                aria-pressed={format === f.key}
                onClick={() => setFormat(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="label">Series</span>
            <select
              className="txt"
              value={seriesChoice}
              onChange={(e) => setSeriesChoice(e.target.value)}
            >
              <option value="">Standalone (no series)</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || 'Untitled series'}
                </option>
              ))}
              <option value="new">+ A new series…</option>
            </select>
          </label>
          {seriesChoice === 'new' && (
            <label className="min-w-[200px] flex-1">
              <span className="sr-only">New series name</span>
              <input
                className="txt"
                placeholder="Series name"
                value={newSeries}
                onChange={(e) => setNewSeries(e.target.value)}
              />
            </label>
          )}
        </div>
      </section>

      <section className="panel flex flex-col gap-3" aria-labelledby="step-structure">
        <h2 id="step-structure" className="text-[1.1rem]">
          3. Pick a structure
        </h2>
        <p className="-mt-1.5 text-[0.85rem] text-muted">
          You can switch later without losing your notes.{' '}
          <Link
            to="/appendix"
            search={{ topic: 'Story structures explained' }}
            className="text-accent underline"
          >
            Which one fits?
          </Link>
        </p>
        <div
          role="group"
          aria-label="Structure"
          className="grid grid-cols-2 gap-2 max-sm:grid-cols-1"
        >
          {STRUCTURES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="gen-box flex flex-col gap-0.5"
              aria-pressed={structure === s.key}
              onClick={() => setStructure(s.key)}
            >
              <span className="text-[0.95rem] font-semibold">{s.name}</span>
              <span className="text-[0.8rem] opacity-80">
                {s.beats.length} beats · {s.bestFor}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={!ready}>
          Start the outline
        </button>
        {!ready && (
          <span className="text-[0.82rem] text-muted">
            {method === 'concept'
              ? 'Choose a concept first.'
              : method === 'character'
                ? 'Choose a protagonist first.'
                : 'Name the new series first.'}
          </span>
        )}
      </div>
    </form>
  );
}
