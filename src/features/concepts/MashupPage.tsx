import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { useEntries } from '../../lib/entries/hooks';
import { newestFirst } from '../../lib/entries/model';
import { useAuthStore } from '../auth/authStore';
import { createConcept } from './conceptModel';
import {
  draftLogline,
  MASHUP_ROWS,
  randomSide,
  sideFromConcept,
  type MashupSide,
  type RowKey,
  type RowValues,
} from './mashup';

type Choice = 'left' | 'right' | 'own';

/** Where a side's concept comes from: a position in the bank, or a random premise. */
type SideSource = { kind: 'bank'; index: number } | { kind: 'random'; side: MashupSide };

/** Two concepts side by side. Keep the best of each, row by row, and write something new. */
export function MashupPage() {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const concepts = useEntries('concept');
  const bank = useMemo(() => [...(concepts.data ?? [])].sort(newestFirst), [concepts.data]);

  const [left, setLeft] = useState<SideSource>({ kind: 'bank', index: 0 });
  const [right, setRight] = useState<SideSource>({ kind: 'bank', index: 1 });
  const resolve = (src: SideSource): MashupSide =>
    src.kind === 'random'
      ? src.side
      : bank.length
        ? sideFromConcept(bank[((src.index % bank.length) + bank.length) % bank.length]!)
        : randomSide();
  // A side with nothing in the bank to show becomes a random premise, once.
  const [fallback] = useState(() => ({ left: randomSide(), right: randomSide() }));
  const leftSide = bank.length > 0 || left.kind === 'random' ? resolve(left) : fallback.left;
  const rightSide = bank.length > 1 || right.kind === 'random' ? resolve(right) : fallback.right;

  const [choices, setChoices] = useState<Record<RowKey, Choice>>(
    () =>
      Object.fromEntries(MASHUP_ROWS.map((r, i) => [r.key, i % 2 ? 'right' : 'left'])) as Record<
        RowKey,
        Choice
      >,
  );
  const [own, setOwn] = useState<RowValues>(
    () => Object.fromEntries(MASHUP_ROWS.map((r) => [r.key, ''])) as RowValues,
  );

  /** The side (or your own text) each row actually uses: an empty side falls back to the other. */
  const effective = (key: RowKey): Choice => {
    if (choices[key] === 'own' && own[key].trim()) return 'own';
    const pref = choices[key] === 'right' ? 'right' : 'left';
    const other = pref === 'left' ? 'right' : 'left';
    const valueOf = (w: 'left' | 'right') => (w === 'left' ? leftSide : rightSide).values[key];
    return valueOf(pref) || !valueOf(other) ? pref : other;
  };
  const chosen = Object.fromEntries(
    MASHUP_ROWS.map((r) => {
      const which = effective(r.key);
      return [
        r.key,
        which === 'own'
          ? own[r.key].trim()
          : (which === 'left' ? leftSide : rightSide).values[r.key],
      ];
    }),
  ) as RowValues;

  // The logline follows the picks until the writer edits it by hand.
  const [edited, setEdited] = useState<string | null>(null);
  const logline = edited ?? draftLogline(chosen);
  const [name, setName] = useState('');

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!ws || !logline.trim()) return;
    const sourceIds = [leftSide.id, rightSide.id].filter((id): id is string => !!id);
    const id = createConcept(ws, {
      title: name,
      logline,
      parts: { ...chosen },
      sourceIds: [...new Set(sourceIds)],
    });
    toast('Saved to the Concept Bank.');
    void navigate({ to: '/concepts/$conceptId', params: { conceptId: id } });
  };

  const cycle = (set: typeof setLeft, src: SideSource, step: number) =>
    set({ kind: 'bank', index: (src.kind === 'bank' ? src.index : -step) + step });

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
          <Icon name="mash" size={28} />
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Concepts tool</div>
          <h1>The Mashup</h1>
          <p className="mt-1 max-w-[62ch]">
            Two concepts side by side. For each row, keep the left, the right, or write your own,
            and a new concept takes shape underneath.
          </p>
        </div>
      </header>

      <section aria-label="Mashup" className="panel flex flex-col gap-3 p-3">
        <div className="mash-grid">
          <span className="max-sm:hidden" />
          {(
            [
              ['Left', leftSide, left, setLeft],
              ['Right', rightSide, right, setRight],
            ] as const
          ).map(([label, side, src, set]) => (
            <div
              key={label}
              className="flex min-w-0 flex-col gap-1 rounded-lg bg-accent-soft p-2.5"
            >
              <span className="label">{label}</span>
              <span className="truncate font-display font-semibold">{side.title}</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-small"
                  aria-label={`Previous concept on the ${label.toLowerCase()}`}
                  disabled={bank.length === 0}
                  onClick={() => cycle(set, src, -1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  aria-label={`Next concept on the ${label.toLowerCase()}`}
                  disabled={bank.length === 0}
                  onClick={() => cycle(set, src, 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  aria-label={`Random premise on the ${label.toLowerCase()}`}
                  onClick={() => set({ kind: 'random', side: randomSide() })}
                >
                  <Icon name="dice" size={14} /> Random
                </button>
              </div>
            </div>
          ))}
        </div>

        {MASHUP_ROWS.map((row) => (
          <div
            key={row.key}
            role="group"
            aria-label={row.label}
            className="mash-grid border-t border-line pt-3"
          >
            <span className="label self-center">{row.label}</span>
            {(['left', 'right'] as const).map((which) => {
              const value = (which === 'left' ? leftSide : rightSide).values[row.key];
              return (
                <button
                  key={which}
                  type="button"
                  className="gen-box"
                  aria-pressed={!!value && effective(row.key) === which}
                  aria-label={`${row.label} from the ${which}: ${value || 'empty'}`}
                  disabled={!value}
                  onClick={() => setChoices((c) => ({ ...c, [row.key]: which }))}
                >
                  {value || <span className="text-muted">—</span>}
                </button>
              );
            })}
            <input
              className={`txt mash-own ${effective(row.key) === 'own' ? 'border-accent' : ''}`}
              placeholder={`Or your own ${row.label.toLowerCase()}…`}
              aria-label={`Your own ${row.label.toLowerCase()}`}
              value={own[row.key]}
              onChange={(e) => {
                setOwn((o) => ({ ...o, [row.key]: e.target.value }));
                setChoices((c) => ({ ...c, [row.key]: 'own' }));
              }}
            />
          </div>
        ))}
      </section>

      <form
        aria-label="Your new concept"
        className="panel flex flex-col gap-3 border-t-4 border-t-accent"
        onSubmit={save}
      >
        <h2 className="text-[1.05rem]">Your new concept</h2>
        <label className="flex flex-col gap-1">
          <span className="label">Logline</span>
          <textarea
            className="txt min-h-20 text-[1.1rem]"
            value={logline}
            onChange={(e) => setEdited(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-[200px] flex-1">
            <span className="sr-only">Concept name</span>
            <input
              className="txt"
              placeholder="Name it (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {edited !== null && (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setEdited(null)}
            >
              Rebuild from picks
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!logline.trim()}>
            Save to the Concept Bank
          </button>
        </div>
      </form>
    </div>
  );
}
