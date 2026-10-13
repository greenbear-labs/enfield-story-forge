import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { useEntries, useLinks } from '../../lib/entries/hooks';
import { coverOf } from '../../lib/entries/images';
import { InfoLink } from '../appendix/InfoLink';
import { useAuthStore } from '../auth/authStore';
import { castOf, storyName, useCasts } from './castModel';
import { StoryOptions } from './StoryPicker';
import {
  addTie,
  circleLayout,
  kindOf,
  RELATION_KINDS,
  removeTie,
  setTieKind,
  webOrder,
  webTies,
  type RelationKind,
  type Tie,
} from './webModel';

const SIZE = 420;
const R = 20;

const nameOf = (c: Entry) => c.title.trim() || 'Unnamed character';

/** A map of how the cast connects, for everyone or for one story's cast. */
export function RelationshipWebPage({ story, focus }: { story?: string; focus?: string }) {
  const navigate = useNavigate();
  const characters = useEntries('character');
  const related = useLinks({ kind: 'related' });
  const casts = useCasts();

  const storyEntry = casts.stories.find((s) => s.story.id === story)?.story ?? null;
  const shown = useMemo(() => {
    const all = characters.data ?? [];
    if (!storyEntry) return all;
    const members = castOf(storyEntry, casts.links, casts.books);
    return all.filter((c) => members.has(c.id));
  }, [characters.data, storyEntry, casts.links, casts.books]);
  const ties = useMemo(() => webTies(shown, related.data ?? []), [shown, related.data]);
  const focused = shown.find((c) => c.id === focus) ?? null;

  const go = (next: { story?: string; focus?: string }) =>
    void navigate({
      to: '/characters/web',
      search: { story, focus, ...next },
      replace: true,
      resetScroll: false,
    });

  const loading = characters.data === undefined || related.data === undefined || !casts.ready;

  return (
    <div data-sec="char" className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Link
        to="/characters"
        className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Character Center
      </Link>
      <header className="flex flex-col gap-1">
        <span className="label">Character Center</span>
        <h1 className="text-[1.6rem]">Relationship Web</h1>
        <p className="text-[0.92rem] text-muted">
          Everyone your characters are tied to, at a glance. Tap a character to see their ties.{' '}
          <InfoLink topic="Building characters readers believe" label="About characters" />
        </p>
      </header>

      {loading ? (
        characters.error || related.error ? (
          <EmptyState>Couldn’t load your characters. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : (characters.data ?? []).length < 2 ? (
        <EmptyState>
          The web needs at least two characters. Make a few with a Quick Card on the{' '}
          <Link to="/characters" className="font-semibold text-accent hover:underline">
            Character Center
          </Link>
          .
        </EmptyState>
      ) : (
        <>
          <label className="flex max-w-[360px] flex-col gap-1">
            <span className="label">Show</span>
            <select
              className="txt"
              value={storyEntry?.id ?? ''}
              onChange={(e) => go({ story: e.target.value || undefined })}
            >
              <option value="">Every character</option>
              <StoryOptions stories={casts.stories} />
            </select>
          </label>

          {shown.length === 0 ? (
            <EmptyState>
              Nobody is in {storyEntry ? storyName(storyEntry) : 'this cast'} yet. Add characters to
              its cast on the Character Center.
            </EmptyState>
          ) : (
            <>
              <Web
                characters={shown}
                ties={ties}
                focus={focused?.id ?? null}
                onFocus={(id) => go({ focus: id === focused?.id ? undefined : id })}
              />
              <Legend />
              <TieList
                ties={ties}
                focused={focused}
                onClear={() => go({ focus: undefined })}
                onFocus={(id) => go({ focus: id })}
              />
              <AddTie characters={shown} ties={ties} from={focused?.id ?? ''} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/** The drawing: characters on a circle, a line for each tie. */
function Web({
  characters,
  ties,
  focus,
  onFocus,
}: {
  characters: Entry[];
  ties: Tie[];
  focus: string | null;
  onFocus: (id: string) => void;
}) {
  const order = useMemo(() => webOrder(characters, ties), [characters, ties]);
  const at = useMemo(
    () =>
      circleLayout(
        order.map((c) => c.id),
        SIZE,
      ),
    [order],
  );
  const near = useMemo(() => {
    if (!focus) return null;
    const ids = new Set([focus]);
    for (const t of ties) {
      if (t.a.id === focus) ids.add(t.b.id);
      if (t.b.id === focus) ids.add(t.a.id);
    }
    return ids;
  }, [focus, ties]);

  return (
    <div className="panel p-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block h-auto w-full max-w-[520px]"
        role="group"
        aria-label="Relationship Web"
      >
        <defs>
          <clipPath id="web-face" clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>
        {ties.map((t) => {
          const a = at.get(t.a.id)!;
          const b = at.get(t.b.id)!;
          const sec = t.kind ? kindOf(t.kind)?.sec : null;
          const lit = !focus || t.a.id === focus || t.b.id === focus;
          return (
            <line
              key={t.key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={lit && focus ? 3 : 2}
              strokeDasharray={t.aToB && t.bToA ? undefined : '5 4'}
              strokeLinecap="round"
              style={{ stroke: sec ? `var(--sec-${sec})` : 'var(--muted)' }}
              opacity={lit ? 0.9 : 0.12}
            >
              <title>{`${nameOf(t.a)} and ${nameOf(t.b)}${t.kind ? `: ${kindOf(t.kind)!.label}` : ''}`}</title>
            </line>
          );
        })}
        {order.map((c) => {
          const p = at.get(c.id)!;
          const cover = coverOf(c);
          const dim = near && !near.has(c.id);
          const name = nameOf(c);
          const short = name.length > 14 ? `${name.slice(0, 13)}…` : name;
          const below = p.y >= SIZE / 2 - 1;
          return (
            <g
              key={c.id}
              role="button"
              tabIndex={0}
              aria-label={name}
              aria-pressed={focus === c.id}
              className="cursor-pointer outline-none focus-visible:[&>circle:first-child]:stroke-[4]"
              opacity={dim ? 0.35 : 1}
              onClick={() => onFocus(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFocus(c.id);
                }
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={R}
                style={{ fill: 'var(--accent-soft)', stroke: 'var(--accent)' }}
                strokeWidth={focus === c.id ? 4 : 1.5}
              />
              {cover ? (
                <image
                  href={cover.url}
                  x={p.x - R + 2}
                  y={p.y - R + 2}
                  width={(R - 2) * 2}
                  height={(R - 2) * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#web-face)"
                />
              ) : (
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={16}
                  fontWeight={600}
                  style={{ fill: 'var(--accent)' }}
                >
                  {(name[0] ?? '?').toUpperCase()}
                </text>
              )}
              <text
                x={p.x}
                y={below ? p.y + R + 14 : p.y - R - 7}
                textAnchor="middle"
                fontSize={13}
                fontWeight={focus === c.id ? 700 : 500}
                style={{ fill: 'var(--ink)' }}
              >
                {short}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.82rem] text-muted">
      {RELATION_KINDS.map((k) => (
        <li key={k.key} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-[3px] w-5 rounded"
            style={{ background: `var(--sec-${k.sec})` }}
          />
          {k.label}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-[3px] w-5 rounded bg-muted" />
        No kind yet
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block w-5 border-t-2 border-dashed border-muted" />
        Only one side has said
      </li>
    </ul>
  );
}

/** Every tie in words, or just the focused character's. */
function TieList({
  ties,
  focused,
  onClear,
  onFocus,
}: {
  ties: Tie[];
  focused: Entry | null;
  onClear: () => void;
  onFocus: (id: string) => void;
}) {
  const shown = focused ? ties.filter((t) => t.a.id === focused.id || t.b.id === focused.id) : ties;
  return (
    <section className="panel flex flex-col gap-3" aria-label="Ties">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 text-[1.05rem]">
          {focused ? `${nameOf(focused)}’s ties` : 'All ties'}{' '}
          <span className="text-[0.85rem] font-normal text-muted">({shown.length})</span>
        </h2>
        {focused && (
          <>
            <Link
              to="/characters/$characterId"
              params={{ characterId: focused.id }}
              className="btn btn-small"
            >
              Open their card
            </Link>
            <button type="button" className="btn btn-small btn-ghost" onClick={onClear}>
              Show everyone
            </button>
          </>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-[0.9rem] text-muted">
          {focused
            ? `${nameOf(focused)} isn’t tied to anyone here yet. Add a tie below.`
            : 'No ties yet. Add one below, or from a character’s Relationships module.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {shown.map((t) => (
            <TieRow key={t.key} tie={t} onFocus={onFocus} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TieRow({ tie, onFocus }: { tie: Tie; onFocus: (id: string) => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const who = (c: Entry) => (
    <button
      type="button"
      className="font-semibold text-accent hover:underline"
      onClick={() => onFocus(c.id)}
    >
      {nameOf(c)}
    </button>
  );
  const side = (from: Entry, to: Entry, note: string, linked: boolean) =>
    linked ? (
      <p className="text-[0.88rem]">
        <span className="text-muted">
          {nameOf(from)} on {nameOf(to)}:{' '}
        </span>
        {note || <span className="text-muted italic">hasn’t said yet</span>}
      </p>
    ) : null;
  const remove = () => {
    const undo = removeTie(ws, tie);
    toast(`Untied ${nameOf(tie.a)} and ${nameOf(tie.b)}.`, {
      action: { label: 'Undo', onClick: undo },
    });
  };
  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">
          {who(tie.a)} <span className="text-muted">and</span> {who(tie.b)}
        </span>
        <label>
          <span className="sr-only">
            Kind of tie between {nameOf(tie.a)} and {nameOf(tie.b)}
          </span>
          <select
            className="txt py-1 text-[0.85rem]"
            value={tie.kind ?? ''}
            onChange={(e) => setTieKind(ws, tie, e.target.value as RelationKind | '')}
          >
            <option value="">Kind…</option>
            {RELATION_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={`Untie ${nameOf(tie.a)} and ${nameOf(tie.b)}`}
          title="Untie"
          onClick={remove}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {side(tie.a, tie.b, tie.aOnB, tie.aToB)}
      {side(tie.b, tie.a, tie.bOnA, tie.bToA)}
    </li>
  );
}

/** Ties two characters, with a kind and how the first sees the second. */
function AddTie({ characters, ties, from }: { characters: Entry[]; ties: Tie[]; from: string }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const [a, setA] = useState(from);
  const [b, setB] = useState('');
  const [kind, setKind] = useState<RelationKind | ''>('');
  const [note, setNote] = useState('');
  // Follow the focused character until someone picks another.
  const [lastFrom, setLastFrom] = useState(from);
  if (from !== lastFrom) {
    setLastFrom(from);
    setA(from);
  }

  const sorted = useMemo(
    () => [...characters].sort((x, y) => nameOf(x).localeCompare(nameOf(y))),
    [characters],
  );
  const linked = (x: string, y: string) =>
    ties.some(
      (t) => (t.a.id === x && t.b.id === y && t.aToB) || (t.b.id === x && t.a.id === y && t.bToA),
    );
  const already = !!a && !!b && linked(a, b);
  const fromName = characters.find((c) => c.id === a);
  const toName = characters.find((c) => c.id === b);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!a || !b || a === b || already) return;
    addTie(ws, a, b, kind, note);
    toast(`Tied ${nameOf(fromName!)} to ${nameOf(toName!)}.`);
    setB('');
    setKind('');
    setNote('');
  };

  return (
    <form className="panel flex flex-col gap-3" onSubmit={submit} aria-label="Add a tie">
      <h2 className="text-[1.05rem]">Add a tie</h2>
      <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
        <label className="flex flex-col gap-1">
          <span className="label">Who</span>
          <select className="txt" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Choose a character…</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {nameOf(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Is tied to</span>
          <select className="txt" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Choose a character…</option>
            {sorted
              .filter((c) => c.id !== a)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {nameOf(c)}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Kind</span>
          <select
            className="txt"
            value={kind}
            onChange={(e) => setKind(e.target.value as RelationKind | '')}
          >
            <option value="">Not sure yet</option>
            {RELATION_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">
          {fromName ? `How ${nameOf(fromName)} sees` : 'How they see'}{' '}
          {toName ? nameOf(toName) : 'them'}
        </span>
        <input
          className="txt"
          placeholder="e.g. Older sister. Owes her a debt."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={!a || !b || already}>
          Add tie
        </button>
        {already && (
          <span className="text-[0.85rem] text-muted">
            {nameOf(fromName!)} is already tied to {nameOf(toName!)}.
          </span>
        )}
      </div>
    </form>
  );
}
