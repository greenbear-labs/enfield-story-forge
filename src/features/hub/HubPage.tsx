import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon, type IconName } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import type { StationPath } from '../../app/navigation';
import { ENTRY_SECTION, type Entry, type Section } from '../../data/types';
import { entryRoute, entryTypeName } from '../../lib/entries/entryLinks';
import { useEntries, useEntryMap } from '../../lib/entries/hooks';
import { recentlyUpdatedFirst } from '../../lib/entries/model';
import { useAuthStore } from '../auth/authStore';
import { WritingHabit } from '../desk/WritingHabit';
import { createShard } from '../shards/shardModel';

interface JourneyStep {
  to: StationPath;
  sec: Section;
  num: number;
  title: string;
  icon: IconName;
  invite: string;
  count: string;
}

const JOURNEY: JourneyStep[] = [
  {
    to: '/shards',
    sec: 'shard',
    num: 1,
    title: 'Story Shards',
    icon: 'shard',
    invite: 'Start by saving your story shards: a place, a person, a moment.',
    count: 'No shards yet',
  },
  {
    to: '/concepts',
    sec: 'concept',
    num: 2,
    title: 'Concepts',
    icon: 'concept',
    invite: 'Turn sparks into story ideas you could pitch in one sentence.',
    count: 'No concepts yet',
  },
  {
    to: '/outlines',
    sec: 'story',
    num: 3,
    title: 'Outline Builder',
    icon: 'outline',
    invite: 'Pick a structure and build the skeleton of your story.',
    count: 'No outlines yet',
  },
  {
    to: '/desk',
    sec: 'desk',
    num: 4,
    title: 'Writer’s Desk',
    icon: 'desk',
    invite: 'Break it into chapters and scenes, then write.',
    count: 'No words yet',
  },
];

function greetingTime(d = new Date()): string {
  const day = d.toLocaleDateString(undefined, { weekday: 'long' });
  const h = d.getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return `${day} ${part}`;
}

export function HubPage() {
  const user = useAuthStore((s) => s.user);
  const name = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'writer';
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const [shard, setShard] = useState('');
  const entries = useEntries();
  const countOf = (type: Entry['type']) => entries.data?.filter((e) => e.type === type).length ?? 0;
  const shardCount = countOf('shard');
  const conceptCount = countOf('concept');
  const characterCount = countOf('character');
  const notebookCount = countOf('notebook');
  const outlineCount = countOf('book');
  const books = useEntryMap(entries.data?.filter((e) => e.type === 'book'));
  // The chapter or scene you touched last, to go back to.
  const lastPlace = useMemo(() => {
    const live = entries.data ?? [];
    const chapters = new Map(live.filter((e) => e.type === 'chapter').map((e) => [e.id, e]));
    const recent = live
      .filter((e) => e.type === 'chapter' || (e.type === 'scene' && chapters.has(e.parentId ?? '')))
      .sort(recentlyUpdatedFirst)[0];
    if (!recent) return undefined;
    const chapter = recent.type === 'scene' ? chapters.get(recent.parentId!)! : recent;
    return { entry: recent, chapter, book: books.get(chapter.parentId ?? '') };
  }, [entries.data, books]);
  const manuscriptCount =
    entries.data?.filter((e) => e.type === 'book' && e.fields.onDesk === true).length ?? 0;
  const recent = useMemo(
    () => [...(entries.data ?? [])].filter(entryRoute).sort(recentlyUpdatedFirst).slice(0, 5),
    [entries.data],
  );
  const counts: Partial<Record<StationPath, string>> = {};
  if (shardCount) counts['/shards'] = `${shardCount} ${shardCount === 1 ? 'shard' : 'shards'}`;
  if (manuscriptCount)
    counts['/desk'] = `${manuscriptCount} ${manuscriptCount === 1 ? 'manuscript' : 'manuscripts'}`;
  if (outlineCount)
    counts['/outlines'] = `${outlineCount} ${outlineCount === 1 ? 'outline' : 'outlines'}`;
  if (conceptCount)
    counts['/concepts'] = `${conceptCount} ${conceptCount === 1 ? 'concept' : 'concepts'}`;

  return (
    <div data-sec="home" className="flex flex-col gap-[22px]">
      <section className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="label">{greetingTime()}</div>
          <h1 className="text-[2rem] max-sm:text-[1.6rem]">Welcome, {name}.</h1>
          <p className="text-muted">
            Every story moves through four stations. Start at any of them.
          </p>
        </div>
        <Link
          to="/appendix"
          search={{ topic: 'How Story Forge works' }}
          className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-accent"
        >
          <Icon name="info" size={16} /> How Story Forge works
        </Link>
      </section>

      <section className="journey" aria-label="The journey">
        {JOURNEY.map((s) => (
          <Link key={s.to} to={s.to} data-sec={s.sec} className="jstep">
            <span className="font-mono text-[0.75rem] font-medium text-accent">
              STATION {s.num}
            </span>
            <h3 className="flex items-center gap-2 text-[1.15rem]">
              <Icon name={s.icon} className="text-accent" />
              {s.title}
            </h3>
            <p className="text-[0.86rem] text-muted">{s.invite}</p>
            <span className="mt-auto flex items-center justify-between gap-1.5 pt-1.5 text-[0.8rem]">
              <span className="text-muted">{counts[s.to] ?? s.count}</span>
              <span className="font-semibold text-accent">Enter →</span>
            </span>
          </Link>
        ))}
      </section>

      <section
        className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1"
        aria-label="Companion workshops"
      >
        <Link to="/characters" data-sec="char" className="comp">
          <span className="badge">
            <Icon name="char" />
          </span>
          <span>
            <h3>Character Center</h3>
            <p className="text-[0.85rem] text-muted">
              Your cast, and tools to discover new people. Every station uses it.
            </p>
          </span>
          <span className="font-mono text-muted">{characterCount}</span>
        </Link>
        <Link to="/world" data-sec="world" className="comp">
          <span className="badge">
            <Icon name="world" />
          </span>
          <span>
            <h3>Enfield World Creator ↗</h3>
            <p className="text-[0.85rem] text-muted">
              Indexes of peoples, places, items, and magic. Opens as its own app.
            </p>
          </span>
          <span className="font-mono text-muted">{notebookCount}</span>
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.05rem]">Quick access</h2>
        <div className="grid grid-cols-[1.3fr_1fr] gap-3 max-[900px]:grid-cols-1">
          <div className="panel flex flex-col gap-2.5 border-l-4 border-l-accent" data-sec="desk">
            <div className="label">Pick up where you left off</div>
            {lastPlace ? (
              <Link
                {...(lastPlace.entry.type === 'scene'
                  ? { to: '/desk/scenes/$sceneId', params: { sceneId: lastPlace.entry.id } }
                  : { to: '/desk/chapters/$chapterId', params: { chapterId: lastPlace.entry.id } })}
                className="flex flex-col gap-0.5 rounded-md p-1.5 hover:bg-sunken"
              >
                <span className="font-display text-[1.1rem] font-semibold">
                  {lastPlace.entry.title ||
                    (lastPlace.entry.type === 'scene' ? 'Untitled scene' : 'Untitled chapter')}
                </span>
                <span className="text-[0.85rem] text-muted">
                  {[
                    lastPlace.book?.title,
                    lastPlace.entry.type === 'scene' ? lastPlace.chapter.title : '',
                    'Resume →',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </Link>
            ) : (
              <EmptyState>
                Nothing in progress yet. When you start writing, it shows up here.
              </EmptyState>
            )}
          </div>
          <form
            className="panel flex flex-col gap-2"
            data-sec="shard"
            onSubmit={(e) => {
              e.preventDefault();
              if (!shard.trim() || !workspaceId) return;
              createShard(workspaceId, { text: shard, shardType: 'moment' });
              setShard('');
              toast('Shard saved to Story Shards.');
            }}
          >
            <label className="label" htmlFor="hub-shard">
              Quick shard
            </label>
            <textarea
              id="hub-shard"
              className="txt min-h-16"
              placeholder="A spark of an idea… (it goes straight to Story Shards)"
              value={shard}
              onChange={(e) => setShard(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="btn btn-primary btn-small" disabled={!shard.trim()}>
                Save shard
              </button>
              <span className="text-[0.78rem] text-muted">or press + Shard anywhere</span>
            </div>
          </form>
        </div>
        <section className="panel flex flex-col gap-2" data-sec="desk" aria-label="Your writing">
          <div className="label">Your writing</div>
          <WritingHabit />
        </section>
        <div className="grid grid-cols-[1.3fr_1fr] gap-3 max-[900px]:grid-cols-1">
          <div className="panel flex flex-col gap-2">
            <div className="label">Recent</div>
            {recent.length === 0 ? (
              <EmptyState>Things you make or change will be listed here.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-1">
                {recent.map((e) => (
                  <RecentItem key={e.id} entry={e} />
                ))}
              </ul>
            )}
          </div>
          <div className="panel flex flex-col gap-2">
            <div className="label">Your stories</div>
            <EmptyState>No stories yet. They begin as shards and concepts.</EmptyState>
          </div>
        </div>
      </section>
    </div>
  );
}

function RecentItem({ entry }: { entry: Entry }) {
  const route = entryRoute(entry);
  if (!route) return null;
  return (
    <li data-sec={ENTRY_SECTION[entry.type]}>
      <Link {...route} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-sunken">
        <span className="chip flex-none">{entryTypeName(entry.type)}</span>
        <span className="min-w-0 flex-1 truncate">{entry.title || 'Untitled'}</span>
      </Link>
    </li>
  );
}
