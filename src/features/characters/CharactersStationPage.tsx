import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntries } from '../../lib/entries/hooks';
import { coverOf } from '../../lib/entries/images';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { Avatar } from '../images/EntryImg';
import { cardGrid } from '../shards/ShardCard';
import { charactersStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { ArchetypeSparkDialog } from './ArchetypeSparkDialog';
import {
  addToCast,
  castKind,
  castOf,
  createCastGroup,
  removeFromCast,
  storyName,
  useCasts,
  withoutStory,
  type CastReason,
} from './castModel';
import { CharacterCard } from './CharacterCard';
import { CHARACTER_VIEWS, characterRole, filterCast, type CharacterView } from './characterModel';
import { QuickCardDialog } from './QuickCardDialog';
import { StoryOptions } from './StoryPicker';

export function CharactersStationPage({
  story,
  view,
}: {
  story: string | null;
  view: CharacterView;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<'quick' | 'spark' | 'group' | null>(null);
  const close = () => setOpen(null);
  const storyId = story && story !== NO_STORY ? story : null;

  return (
    <StationPage
      content={charactersStation}
      toolActions={{
        'Quick Card': () => setOpen('quick'),
        'Character Interview': () => void navigate({ to: '/characters/interview' }),
        'Archetype Spark': () => setOpen('spark'),
      }}
    >
      <CastShelf current={storyId} onNewGroup={() => setOpen('group')} />
      <Library story={story} view={view} onNew={() => setOpen('quick')} />
      {open === 'quick' && <QuickCardDialog storyId={storyId} onClose={close} />}
      {open === 'spark' && <ArchetypeSparkDialog onClose={close} />}
      {open === 'group' && <NewGroupDialog onClose={close} />}
    </StationPage>
  );
}

/** In the story picker: characters who aren't in any story's cast. */
const NO_STORY = 'none';

const noun = (n: number) => `${n} ${n === 1 ? 'character' : 'characters'}`;

/** A small face: the character's picture, or their initial. */
function Face({ character, size = 28 }: { character: Entry; size?: number }) {
  const initial = (character.title.trim()[0] ?? '?').toUpperCase();
  if (coverOf(character)) return <Avatar entry={character} size={size} />;
  return (
    <span
      aria-hidden
      className="grid flex-none place-items-center rounded-full bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

/** Every story's cast and every group, with how many are in each. */
function CastShelf({ current, onNewGroup }: { current: string | null; onNewGroup: () => void }) {
  const casts = useCasts();
  const characters = useEntries('character');
  const byId = useMemo(
    () => new Map((characters.data ?? []).map((c) => [c.id, c])),
    [characters.data],
  );
  const shelf = useMemo(
    () =>
      casts.stories.map(({ story, series }) => {
        const members = [...castOf(story, casts.links, casts.books).keys()]
          .map((id) => byId.get(id))
          .filter((c): c is Entry => !!c);
        return { story, series, members };
      }),
    [casts.stories, casts.links, casts.books, byId],
  );

  return (
    <StationSection
      title="Casts and groups"
      actions={
        <button type="button" className="btn btn-small" onClick={onNewGroup}>
          + New group
        </button>
      }
    >
      {!casts.ready || !characters.data ? (
        <Loading />
      ) : shelf.length === 0 ? (
        <EmptyState>
          Every outline has a cast. Start one in the Outline Builder, or make a group here for
          characters who belong together.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5">
          {shelf.map(({ story, series, members }) => (
            <li key={story.id}>
              <Link
                to="/characters"
                search={{ story: story.id }}
                resetScroll={false}
                data-sec="char"
                aria-current={story.id === current ? 'true' : undefined}
                className={`entry-card h-full gap-2 ${story.id === current ? 'border-accent' : ''}`}
              >
                <span className="flex items-center justify-between gap-2 text-[0.75rem] text-muted">
                  <span className="truncate">
                    {castKind(story)}
                    {series ? ` · ${storyName(series)}` : ''}
                  </span>
                  <span className="chip flex-none">{members.length}</span>
                </span>
                <span className="font-display text-[1.05rem] font-semibold">
                  {storyName(story)}
                </span>
                {members.length > 0 ? (
                  <span className="flex items-center gap-1" aria-label={noun(members.length)}>
                    {members.slice(0, 6).map((c) => (
                      <Face key={c.id} character={c} size={26} />
                    ))}
                    {members.length > 6 && (
                      <span className="text-[0.78rem] text-muted">+{members.length - 6}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-[0.82rem] text-muted">No one yet</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StationSection>
  );
}

function NewGroupDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createCastGroup(ws, name);
    onClose();
    void navigate({ to: '/characters', search: { story: id }, resetScroll: false });
  };
  return (
    <Dialog title="New group" sec="char" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={save}>
        <p className="text-[0.88rem] text-muted">
          A group gathers characters who belong together: a crew, a family, or the cast of a story
          you haven’t outlined yet. Each outline already has its own cast.
        </p>
        <label className="flex flex-col gap-1">
          <span className="label">Name</span>
          <input
            className="txt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Salt Key crew"
            autoFocus
          />
        </label>
        <div>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Make the group
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Library({
  story,
  view,
  onNew,
}: {
  story: string | null;
  view: CharacterView;
  onNew: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const characters = useEntries('character');
  const casts = useCasts();
  const [query, setQuery] = useState('');
  const current = casts.stories.find((s) => s.story.id === story)?.story ?? null;
  const all = characters.data;

  const cast = useMemo(
    () => (current ? castOf(current, casts.links, casts.books) : null),
    [current, casts.links, casts.books],
  );
  const inView = useMemo(() => {
    if (!all) return [];
    if (story === NO_STORY) return withoutStory(all, casts.links, casts.books);
    return cast ? all.filter((c) => cast.has(c.id)) : all;
  }, [all, story, cast, casts.links, casts.books]);
  const visible = useMemo(() => filterCast(inView, query), [inView, query]);
  const others = useMemo(
    () => (cast && all ? filterCast(all, '').filter((c) => !cast.has(c.id)) : []),
    [all, cast],
  );
  // Each character's casts, for the list and the by-cast view.
  const castsOf = useMemo(() => {
    const out = new Map<string, Entry[]>();
    for (const { story: s } of casts.stories)
      for (const id of castOf(s, casts.links, casts.books).keys())
        out.set(id, [...(out.get(id) ?? []), s]);
    return out;
  }, [casts.stories, casts.links, casts.books]);
  const total = all?.length ?? 0;

  const go = (search: { story?: string; view?: CharacterView }) =>
    void navigate({
      to: '/characters',
      search: {
        ...(search.story ? { story: search.story } : {}),
        ...(search.view && search.view !== 'cards' ? { view: search.view } : {}),
      },
      replace: true,
      resetScroll: false,
    });
  const pick = (value: string) => go({ story: value || undefined, view });

  return (
    <StationSection
      title={charactersStation.library.title}
      actions={
        <button type="button" className="btn btn-small" onClick={onNew}>
          + New character
        </button>
      }
    >
      {characters.error ? (
        <EmptyState>Couldn’t load your characters. Check your connection and reload.</EmptyState>
      ) : all === undefined ? (
        <Loading />
      ) : total === 0 ? (
        <EmptyState>{charactersStation.library.empty}</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {casts.stories.length > 0 && (
              <label className="min-w-[200px] flex-1 sm:max-w-[320px]">
                <span className="sr-only">Show the cast of</span>
                <select
                  className="txt"
                  value={current ? current.id : story === NO_STORY ? NO_STORY : ''}
                  onChange={(e) => pick(e.target.value)}
                >
                  <option value="">Everyone, from every story</option>
                  <StoryOptions stories={casts.stories} />
                  <option value={NO_STORY}>Not in a story yet</option>
                </select>
              </label>
            )}
            <label className="relative flex min-w-[200px] flex-[2] items-center">
              <span className="sr-only">Search the characters</span>
              <Icon name="search" className="pointer-events-none absolute left-2.5 text-muted" />
              <input
                type="search"
                className="txt pl-8"
                placeholder="Search names, roles, and anything on their cards"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div role="group" aria-label="View" className="flex gap-1">
              {CHARACTER_VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className={`btn btn-small ${view === v.key ? 'btn-primary' : ''}`}
                  aria-pressed={view === v.key}
                  onClick={() => go({ story: story ?? undefined, view: v.key })}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          {current && (
            <CurrentCast
              story={current}
              others={others}
              onAdd={(id) => addToCast(ws, id, current.id)}
              onGone={() => pick('')}
            />
          )}
          <p className="text-[0.8rem] text-muted">
            {current
              ? `${noun(visible.length)} in ${storyName(current)}`
              : story === NO_STORY
                ? `${noun(visible.length)} not in a story yet`
                : visible.length === total
                  ? noun(total)
                  : `${visible.length} of ${noun(total)}`}
          </p>
          {visible.length === 0 ? (
            <EmptyState>
              {query
                ? 'No one matches.'
                : current
                  ? 'No one here yet. Add someone above, or make a new character.'
                  : 'Everyone is in a story’s cast.'}
            </EmptyState>
          ) : view === 'list' ? (
            <CharacterList
              characters={visible}
              castsOf={castsOf}
              current={current}
              cast={cast}
              hideCast={current?.id}
            />
          ) : view === 'casts' ? (
            <ByCast characters={visible} castsOf={castsOf} stories={casts.stories} />
          ) : (
            <div className={cardGrid}>
              {visible.map((c) => (
                <div key={c.id} className="relative flex flex-col">
                  <CharacterCard character={c} />
                  <CastBadge character={c} current={current} why={cast?.get(c.id)} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </StationSection>
  );
}

/** The cast being shown: add people to it, and for a group, rename or delete it. */
function CurrentCast({
  story,
  others,
  onAdd,
  onGone,
}: {
  story: Entry;
  others: Entry[];
  onAdd: (characterId: string) => void;
  onGone: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {story.type === 'cast_group' && <GroupName key={story.id} group={story} />}
      {others.length > 0 && (
        <label className="min-w-[200px] flex-1 sm:max-w-[320px]">
          <span className="sr-only">Add someone to this cast</span>
          <select
            className="txt"
            value=""
            onChange={(e) => {
              if (e.target.value) onAdd(e.target.value);
            }}
          >
            <option value="">+ Add someone to this cast…</option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || 'Unnamed character'}
              </option>
            ))}
          </select>
        </label>
      )}
      {story.type === 'book' && (
        <Link
          to="/outlines/$outlineId"
          params={{ outlineId: story.id }}
          data-sec="story"
          className="btn btn-small text-accent"
        >
          Open the outline →
        </Link>
      )}
      {story.type === 'cast_group' && (
        <button
          type="button"
          className="btn btn-small"
          onClick={() => {
            trashEntry(ws, story.id);
            onGone();
            toast(`Deleted the group “${storyName(story)}”. Its characters are still here.`, {
              action: { label: 'Undo', onClick: () => restoreEntry(ws, story.id) },
            });
          }}
        >
          <Icon name="trash" size={14} /> Delete group
        </button>
      )}
    </div>
  );
}

function GroupName({ group }: { group: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const name = useAutosaved(group.title, (v) =>
    updateEntry(ws, group.id, { title: v.trim() || 'Untitled group' }),
  );
  return (
    <label className="min-w-[200px] flex-1 sm:max-w-[320px]">
      <span className="sr-only">Group name</span>
      <input className="txt font-semibold" {...name.props} />
    </label>
  );
}

const REASONS = {
  series: 'From the series',
  book: 'From a book',
  protagonist: 'The story’s protagonist',
} as const;

/** On a card in a cast: take them out, or say how they got in. */
function CastBadge({
  character,
  current,
  why,
}: {
  character: Entry;
  current: Entry | null;
  why: CastReason | undefined;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  if (!current || !why) return null;
  return why === 'cast' ? (
    <button
      type="button"
      className="btn btn-ghost btn-icon absolute top-1.5 right-1.5"
      aria-label={`Take ${character.title || 'them'} out of this cast`}
      title="Take out of this cast"
      onClick={() => removeFromCast(ws, character.id, current.id)}
    >
      <Icon name="close" size={14} />
    </button>
  ) : (
    <span className="absolute top-2 right-2 text-[0.72rem] text-muted">{REASONS[why]}</span>
  );
}

function CastChips({ stories }: { stories: Entry[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {stories.map((s) => (
        <Link
          key={s.id}
          to="/characters"
          search={{ story: s.id }}
          resetScroll={false}
          className="chip hover:underline"
        >
          {storyName(s)}
        </Link>
      ))}
    </span>
  );
}

/** One row per character: face, name, role, and the casts they're in. */
function CharacterList({
  characters,
  castsOf,
  current,
  cast,
  hideCast,
}: {
  characters: Entry[];
  castsOf: Map<string, Entry[]>;
  current: Entry | null;
  cast: Map<string, CastReason> | null;
  hideCast?: string;
}) {
  return (
    <ul className="panel flex flex-col divide-y divide-line p-0" data-sec="char">
      {characters.map((c) => {
        const theirs = (castsOf.get(c.id) ?? []).filter((s) => s.id !== hideCast);
        return (
          <li key={c.id} className="relative flex items-center gap-3 px-3 py-2.5">
            <Face character={c} size={36} />
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                to="/characters/$characterId"
                params={{ characterId: c.id }}
                className="font-semibold text-accent hover:underline"
              >
                {c.title || 'Unnamed character'}
              </Link>
              <span className="text-[0.85rem] text-muted">{characterRole(c) || 'No role yet'}</span>
              {theirs.length > 0 && <CastChips stories={theirs} />}
            </span>
            {current && cast?.get(c.id) === 'cast' && (
              <CastBadge character={c} current={current} why="cast" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Characters grouped under each cast they're in, then everyone not in one. */
function ByCast({
  characters,
  castsOf,
  stories,
}: {
  characters: Entry[];
  castsOf: Map<string, Entry[]>;
  stories: { story: Entry }[];
}) {
  const sections = stories
    .map(({ story }) => ({
      story,
      members: characters.filter((c) => castsOf.get(c.id)?.some((s) => s.id === story.id)),
    }))
    .filter((s) => s.members.length > 0);
  const loose = characters.filter((c) => !castsOf.get(c.id)?.length);
  return (
    <div className="flex flex-col gap-4">
      {sections.map(({ story, members }) => (
        <section key={story.id} className="flex flex-col gap-2" aria-label={storyName(story)}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[1rem]">
              {storyName(story)}{' '}
              <span className="text-[0.8rem] font-normal text-muted">
                {castKind(story)} · {noun(members.length)}
              </span>
            </h3>
            <Link
              to="/characters"
              search={{ story: story.id }}
              resetScroll={false}
              className="text-[0.85rem] font-semibold text-accent"
            >
              Open this cast →
            </Link>
          </div>
          <CharacterList
            characters={members}
            castsOf={castsOf}
            current={null}
            cast={null}
            hideCast={story.id}
          />
        </section>
      ))}
      {loose.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Not in a cast yet">
          <h3 className="text-[1rem]">
            Not in a cast yet{' '}
            <span className="text-[0.8rem] font-normal text-muted">{noun(loose.length)}</span>
          </h3>
          <CharacterList characters={loose} castsOf={castsOf} current={null} cast={null} />
        </section>
      )}
    </div>
  );
}
