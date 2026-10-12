import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { cardGrid } from '../shards/ShardCard';
import { charactersStation } from '../stations/content';
import { StationPage, StationSection } from '../stations/StationPage';
import { ArchetypeSparkDialog } from './ArchetypeSparkDialog';
import { addToCast, castOf, removeFromCast, storyName, useCasts, withoutStory } from './castModel';
import { CharacterCard } from './CharacterCard';
import { filterCast } from './characterModel';
import { QuickCardDialog } from './QuickCardDialog';
import { StoryOptions } from './StoryPicker';

export function CharactersStationPage({ story }: { story: string | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<'quick' | 'spark' | null>(null);
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
      <Cast story={story} onNew={() => setOpen('quick')} />
      {open === 'quick' && <QuickCardDialog storyId={storyId} onClose={close} />}
      {open === 'spark' && <ArchetypeSparkDialog onClose={close} />}
    </StationPage>
  );
}

/** In the story picker: characters who aren't in any story's cast. */
const NO_STORY = 'none';

function Cast({ story, onNew }: { story: string | null; onNew: () => void }) {
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
  const total = all?.length ?? 0;
  const noun = (n: number) => `${n} ${n === 1 ? 'character' : 'characters'}`;

  const pick = (value: string) =>
    void navigate({
      to: '/characters',
      search: value ? { story: value } : {},
      replace: true,
      resetScroll: false,
    });

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
        <EmptyState>Couldn’t load your cast. Check your connection and reload.</EmptyState>
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
              <span className="sr-only">Search the cast</span>
              <Icon name="search" className="pointer-events-none absolute left-2.5 text-muted" />
              <input
                type="search"
                className="txt pl-8"
                placeholder="Search names, roles, and anything on their cards"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {current && (
            <div className="flex flex-wrap items-center gap-2">
              {others.length > 0 && (
                <label className="min-w-[200px] flex-1 sm:max-w-[320px]">
                  <span className="sr-only">Add someone to this cast</span>
                  <select
                    className="txt"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addToCast(ws, e.target.value, current.id);
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
              {current.type === 'book' && (
                <Link
                  to="/outlines/$outlineId"
                  params={{ outlineId: current.id }}
                  data-sec="story"
                  className="btn btn-small text-accent"
                >
                  Open the outline →
                </Link>
              )}
            </div>
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
                  ? 'No one in this cast yet. Add someone above, or make a new character.'
                  : 'Everyone is in a story’s cast.'}
            </EmptyState>
          ) : (
            <div className={cardGrid}>
              {visible.map((c) => {
                const why = cast?.get(c.id);
                return (
                  <div key={c.id} className="relative flex flex-col">
                    <CharacterCard character={c} />
                    {current && why === 'cast' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon absolute top-1.5 right-1.5"
                        aria-label={`Take ${c.title || 'them'} out of this cast`}
                        title="Take out of this cast"
                        onClick={() => removeFromCast(ws, c.id, current.id)}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                    {why && why !== 'cast' && (
                      <span className="absolute top-2 right-2 text-[0.72rem] text-muted">
                        {REASONS[why]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </StationSection>
  );
}

const REASONS = {
  series: 'From the series',
  book: 'From a book',
  protagonist: 'The story’s protagonist',
} as const;
