import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { Entry } from '../../data/types';
import { useEntries } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { Avatar } from '../images/EntryImg';
import { protagonistId } from '../outlines/outlineModel';
import {
  addToCast,
  castOf,
  removeFromCast,
  storiesOf,
  storyName,
  useCasts,
  type CastReason,
} from './castModel';
import { characterRole, filterCast } from './characterModel';
import { QuickCardDialog } from './QuickCardDialog';
import { StoryOptions } from './StoryPicker';

/** On a character's page: the stories whose cast they're in, and a way to add one. */
export function CharacterStories({ character }: { character: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const casts = useCasts();
  const mine = storiesOf(character.id, casts.links);
  const byId = new Map(casts.stories.map((s) => [s.story.id, s.story]));
  const heroOf = casts.books.filter(
    (b) => protagonistId(b) === character.id && !mine.includes(b.id) && byId.has(b.id),
  );
  if (!casts.ready) return null;

  return (
    <div data-sec="story" className="flex flex-col gap-1.5">
      <span className="label">Stories</span>
      {casts.stories.length === 0 ? (
        <p className="text-[0.85rem] text-muted">
          No stories yet. Start an outline, then add them to its cast.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {mine.flatMap((id) => {
            const story = byId.get(id);
            if (!story) return [];
            return (
              <span key={id} className="chip gap-1 pr-1">
                <StoryLink story={story} />
                <button
                  type="button"
                  className="grid size-5 place-items-center rounded-full border-0 bg-transparent p-0 text-current hover:bg-surface"
                  aria-label={`Take them out of ${storyName(story)}`}
                  title="Take out of this cast"
                  onClick={() => removeFromCast(ws, character.id, id)}
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            );
          })}
          {heroOf.map((b) => (
            <span key={b.id} className="chip" title="They’re this story’s protagonist">
              <StoryLink story={b} />
              <span className="font-normal opacity-75">· protagonist</span>
            </span>
          ))}
          <label className="min-w-[180px]">
            <span className="sr-only">Add them to a story or group</span>
            <select
              className="txt py-1 text-[0.85rem]"
              value=""
              onChange={(e) => {
                if (e.target.value) addToCast(ws, character.id, e.target.value);
              }}
            >
              <option value="">+ Add to a story or group…</option>
              <StoryOptions stories={casts.stories} skip={new Set(mine)} />
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function StoryLink({ story }: { story: Entry }) {
  return story.type === 'book' ? (
    <Link to="/outlines/$outlineId" params={{ outlineId: story.id }} className="hover:underline">
      {storyName(story)}
    </Link>
  ) : (
    <Link to="/characters" search={{ story: story.id }} className="hover:underline">
      {storyName(story)} ({story.type === 'series' ? 'series' : 'group'})
    </Link>
  );
}

const REASON_NOTES: Record<Exclude<CastReason, 'cast'>, string> = {
  series: 'from the series',
  book: 'from a book',
  protagonist: 'protagonist',
};

/** A cast member's role, and how they got into the cast unless they were added to it. */
function castNote(role: string, why: CastReason): string {
  const note = why === 'cast' ? '' : REASON_NOTES[why];
  if (!role) return note ? note.charAt(0).toUpperCase() + note.slice(1) : 'No role yet';
  return note && note !== role.toLowerCase() ? `${role} · ${note}` : role;
}

/** On an outline: everyone in the story's cast, with ways to add and take out. */
export function StoryCast({ story }: { story: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const casts = useCasts();
  const characters = useEntries('character');
  const [creating, setCreating] = useState(false);
  const cast = useMemo(
    () => castOf(story, casts.links, casts.books),
    [story, casts.links, casts.books],
  );
  const everyone = useMemo(() => filterCast(characters.data ?? [], ''), [characters.data]);
  const members = everyone
    .filter((c) => cast.has(c.id))
    .sort((a, b) => a.title.localeCompare(b.title));
  const others = everyone.filter((c) => !cast.has(c.id));

  return (
    <section id="cast" data-sec="char" className="flex scroll-mt-28 flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[1.05rem]">Cast</h2>
        <span className="chip">{members.length}</span>
      </div>
      <p className="-mt-1.5 text-[0.85rem] text-muted">
        Everyone in this story. {story.parentId ? 'The series’ cast is here too. ' : ''}
        <Link to="/characters" search={{ story: story.id }} className="text-accent hover:underline">
          See them in the Character Center
        </Link>
      </p>
      <div className="panel flex flex-col gap-3">
        {members.length === 0 ? (
          <p className="text-[0.9rem] text-muted">No one yet. Add characters from your cast.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {members.map((c) => {
              const why = cast.get(c.id)!;
              const role = characterRole(c);
              return (
                <li key={c.id} className="flex min-w-0 items-center gap-2.5">
                  <Avatar entry={c} size={36} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to="/characters/$characterId"
                      params={{ characterId: c.id }}
                      className="truncate font-semibold text-accent hover:underline"
                    >
                      {c.title || 'Unnamed character'}
                    </Link>
                    <span className="truncate text-[0.8rem] text-muted">{castNote(role, why)}</span>
                  </span>
                  {why === 'cast' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon flex-none"
                      aria-label={`Take ${c.title || 'them'} out of the cast`}
                      title="Take out of the cast"
                      onClick={() => removeFromCast(ws, c.id, story.id)}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {others.length > 0 && (
            <label className="min-w-[200px] flex-1 sm:max-w-[320px]">
              <span className="sr-only">Add someone to the cast</span>
              <select
                className="txt"
                value=""
                onChange={(e) => {
                  if (e.target.value) addToCast(ws, e.target.value, story.id);
                }}
              >
                <option value="">+ Add a character…</option>
                {others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || 'Unnamed character'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn btn-small" onClick={() => setCreating(true)}>
            + New character
          </button>
        </div>
      </div>
      {creating && <QuickCardDialog storyId={story.id} onClose={() => setCreating(false)} />}
    </section>
  );
}
