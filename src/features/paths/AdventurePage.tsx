import { Link, useNavigate } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { restoreEntry, trashEntry, updateEntry } from '../../lib/entries/entries';
import { useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { coverOf } from '../../lib/entries/images';
import { EntryGallery } from '../images/EntryGallery';
import { EntryImg } from '../images/EntryImg';
import { EntryGate } from '../world/WorldFrame';
import { CategoryPicker } from './CategoryPicker';
import { adventureBlurb, adventureCategories } from './pathsModel';
import { usePathsTitle } from './usePathsTitle';

/** One adventure: its title, blurb, categories, and cover. */
export function AdventurePage({ adventureId }: { adventureId: string }) {
  const adventure = useEntry(adventureId);
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[0.85rem]">
        <Link to="/paths" className="text-muted hover:text-accent">
          ← Shadow Paths
        </Link>
      </nav>
      <EntryGate live={adventure} noun="adventure">
        {(a) => <Adventure key={a.id} adventure={a} />}
      </EntryGate>
    </>
  );
}

function Adventure({ adventure }: { adventure: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
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
    trashEntry(ws, adventure.id);
    void navigate({ to: '/paths' });
    toast('Adventure moved to the trash.', {
      action: { label: 'Undo', onClick: () => restoreEntry(ws, adventure.id) },
    });
  };

  return (
    <>
      <header className="paths-banner flex min-h-[200px] items-end gap-3 p-6 max-sm:p-4">
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

      <section className="panel flex flex-col gap-3" aria-label="About this adventure">
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
      </section>

      <EntryGallery entry={adventure} label="Cover and pictures" />

      <section className="flex flex-col gap-2.5" aria-label="Passages">
        <h2 className="text-[1.05rem]">Passages</h2>
        <EmptyState>
          The story map comes next: passages, choices, and endings, laid out like a trail through
          the woods that you can play as you go.
        </EmptyState>
      </section>
    </>
  );
}
