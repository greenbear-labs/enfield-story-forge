import { Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { Icon } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { useEntries, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { coverOf } from '../../lib/entries/images';
import { EntryGallery } from '../images/EntryGallery';
import { EntryImg } from '../images/EntryImg';
import { EntryGate } from '../world/WorldFrame';
import { trashAll } from '../world/worldModel';
import { PassageList } from './PassageList';
import { PassagePanel } from './PassagePanel';
import { CategoryPicker } from './CategoryPicker';
import { StoryStateEditor } from './StateEditor';
import { StoryHealth } from './StoryHealth';
import { storyVars } from './stateModel';
import {
  adventureBlurb,
  adventureCategories,
  createPassage,
  freeSpot,
  posOf,
  startIdOf,
} from './pathsModel';
import { usePathsTitle } from './usePathsTitle';

// The map (and its canvas library) loads only when an adventure is opened.
const StoryMap = lazy(() => import('./StoryMap'));

type View = 'map' | 'list';
const wideScreen = () => window.matchMedia('(min-width: 768px)').matches;

/** One adventure: its story map of passages, and its title, blurb, categories, and cover. */
export function AdventurePage({
  adventureId,
  passageId,
}: {
  adventureId: string;
  passageId?: string;
}) {
  const adventure = useEntry(adventureId);
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[0.85rem]">
        <Link to="/paths" className="text-muted hover:text-accent">
          ← Shadow Paths
        </Link>
      </nav>
      <EntryGate live={adventure} noun="adventure">
        {(a) => <Adventure key={a.id} adventure={a} passageId={passageId ?? null} />}
      </EntryGate>
    </>
  );
}

function Adventure({ adventure, passageId }: { adventure: Entry; passageId: string | null }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const allPassages = useEntries('passage');
  const passages = useMemo(
    () => allPassages.data?.filter((p) => p.parentId === adventure.id),
    [allPassages.data, adventure.id],
  );
  const startId = startIdOf(adventure);
  const selected = passages?.find((p) => p.id === passageId) ?? null;
  const [view, setView] = useState<View>(() => (wideScreen() ? 'map' : 'list'));

  // The open passage lives in the address, so a link (or search) can open it.
  const onSelect = useCallback(
    (id: string | null) =>
      void navigate({
        to: '/paths/$adventureId',
        params: { adventureId: adventure.id },
        search: id ? { passage: id } : {},
        replace: true,
      }),
    [navigate, adventure.id],
  );

  /** A new passage below the others, for the list view and the first passage. */
  const addPassage = () => {
    const bottom = (passages ?? []).reduce((y, p) => Math.max(y, posOf(p).y + 160), 0);
    onSelect(createPassage(ws, adventure, freeSpot(passages ?? [], { x: 0, y: bottom })));
  };
  const cover = coverOf(adventure);
  usePathsTitle(adventure.title || 'Untitled adventure');
  const title = useAutosaved(adventure.title, (v) =>
    updateEntry(ws, adventure.id, { title: v.trim() || 'Untitled adventure' }),
  );
  const blurb = useAutosaved(adventureBlurb(adventure), (v) =>
    updateEntry(ws, adventure.id, {}, { blurb: v.trim() }),
  );

  const onDelete = () => {
    title.flush();
    blurb.flush();
    const undo = trashAll(ws, [adventure.id, ...(passages ?? []).map((p) => p.id)]);
    void navigate({ to: '/paths' });
    toast('Adventure moved to the trash, with its passages.', {
      action: { label: 'Undo', onClick: undo },
    });
  };

  return (
    <>
      <header className="paths-banner flex min-h-[150px] items-end gap-3 p-6 max-sm:p-4">
        {cover ? <EntryImg image={cover} alt="" /> : <img src="/paths-art/fog-glade.webp" alt="" />}
        <div className="paths-banner-body flex min-w-0 flex-1 flex-col gap-1">
          <span className="label text-accent">Adventure · draft</span>
          <label>
            <span className="sr-only">Title</span>
            <input
              className="paths-glow w-full border-0 bg-transparent p-0 font-display text-[2.2rem] outline-none max-sm:text-[1.6rem]"
              {...title.props}
            />
          </label>
        </div>
        <div className="paths-banner-body self-start">
          <Menu
            label="Adventure"
            align="right"
            trigger={(props) => (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Adventure options"
                {...props}
              >
                <Icon name="more" />
              </button>
            )}
          >
            {() => (
              <button type="button" role="menuitem" className="menu-item" onClick={onDelete}>
                <Icon name="trash" size={16} />
                Delete adventure
              </button>
            )}
          </Menu>
        </div>
      </header>

      <section id="the-story" className="flex flex-col gap-2.5" aria-label="The story">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[1.4rem]">The story</h2>
          <div className="flex flex-wrap items-center gap-2">
            {startId && (
              <Link
                to="/paths/$adventureId/play"
                params={{ adventureId: adventure.id }}
                className="btn btn-primary btn-small"
              >
                Playtest
              </Link>
            )}
            <div role="group" aria-label="Show the story as" className="flex gap-1.5">
              <button
                type="button"
                className="seg"
                aria-pressed={view === 'map'}
                onClick={() => setView('map')}
              >
                Map
              </button>
              <button
                type="button"
                className="seg"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                List
              </button>
            </div>
          </div>
        </div>
        {allPassages.error ? (
          <EmptyState>Couldn’t load the passages. Check your connection and reload.</EmptyState>
        ) : passages === undefined ? (
          <Loading />
        ) : passages.length === 0 ? (
          <div className="paths-banner flex min-h-[260px] items-center justify-center p-6 text-center">
            <img src="/paths-art/hero-forest.webp" alt="" />
            <div className="paths-banner-body flex max-w-[440px] flex-col items-center gap-3">
              <p className="font-display text-[1.3rem] italic">
                Every adventure starts with a single passage: where the reader wakes, arrives, or
                first hears the knock at the door.
              </p>
              <button type="button" className="btn btn-primary" onClick={addPassage}>
                Write the first passage
              </button>
            </div>
          </div>
        ) : (
          <div className={selected ? 'sp-workspace has-panel' : 'sp-workspace'}>
            <div className="sp-view">
              {view === 'map' ? (
                <Suspense fallback={<Loading />}>
                  <StoryMap
                    adventure={adventure}
                    passages={passages}
                    startId={startId}
                    selectedId={selected?.id ?? null}
                    onSelect={onSelect}
                  />
                </Suspense>
              ) : (
                <>
                  <PassageList
                    passages={passages}
                    startId={startId}
                    selectedId={selected?.id ?? null}
                    onSelect={onSelect}
                  />
                  <button type="button" className="btn btn-small self-start" onClick={addPassage}>
                    + Passage
                  </button>
                </>
              )}
            </div>
            {selected && (
              <PassagePanel
                key={selected.id}
                adventure={adventure}
                passage={selected}
                passages={passages}
                startId={startId}
                onSelect={onSelect}
              />
            )}
          </div>
        )}
      </section>

      {passages && passages.length > 0 && (
        <StoryHealth
          adventure={adventure}
          passages={passages}
          onOpen={(id) => {
            onSelect(id);
            document.getElementById('the-story')?.scrollIntoView({ block: 'start' });
          }}
        />
      )}

      <details className="panel sp-details" open={storyVars(adventure).length > 0 || undefined}>
        <summary className="cursor-pointer font-display text-[1.15rem]">
          Story state: items, flags, and counters
        </summary>
        <div className="pt-3">
          <StoryStateEditor adventure={adventure} />
        </div>
      </details>

      <details className="panel sp-details">
        <summary className="cursor-pointer font-display text-[1.15rem]">
          Story details: blurb, categories, and cover
        </summary>
        <div className="flex flex-col gap-3 pt-3">
          <label className="flex flex-col gap-1">
            <span className="label">Blurb</span>
            <textarea
              className="txt"
              rows={3}
              placeholder="What a reader sees before they start"
              {...blurb.props}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="label">Categories</span>
            <CategoryPicker
              value={adventureCategories(adventure)}
              onChange={(categories) => updateEntry(ws, adventure.id, {}, { categories })}
            />
          </div>
          <EntryGallery entry={adventure} label="Cover and pictures" />
        </div>
      </details>
    </>
  );
}
