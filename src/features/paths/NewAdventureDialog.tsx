import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { useEntries } from '../../lib/entries/hooks';
import { useAuthStore } from '../auth/authStore';
import { CustomStructuresSync } from '../outlines/CustomStructuresSync';
import { useStructures } from '../outlines/structures';
import { CategoryPicker } from './CategoryPicker';
import {
  adventureFromOutline,
  chaptersOf,
  outlineBlurb,
  outlineSteps,
  type OutlineSteps,
} from './outlineAdventure';
import { createAdventure } from './pathsModel';

/**
 * Name a new adventure, then open it. It can start from one of the writer's
 * outlines: its beats (or its chapters) become passages in a line.
 */
export function NewAdventureDialog({
  onClose,
  outlineId = '',
}: {
  onClose: () => void;
  /** The outline to start from, when opened from one. */
  outlineId?: string;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  // An outline can use one of the writer's own structures.
  useStructures();
  const books = useEntries('book').data;
  const chapters = useEntries('chapter').data;
  const scenes = useEntries('scene').data;
  const [fromId, setFromId] = useState(outlineId);
  const outline = books?.find((b) => b.id === fromId) ?? null;
  const [title, setTitle] = useState<string | null>(null);
  const [blurb, setBlurb] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [by, setBy] = useState<OutlineSteps>('beats');

  const outlines = useMemo(
    () => [...(books ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [books],
  );
  const chapterCount = outline ? chaptersOf(outline, chapters ?? []).length : 0;
  const steps =
    outline && chapters && scenes
      ? outlineSteps(outline, chapterCount ? by : 'beats', chapters, scenes)
      : [];
  // Until the writer types, the title and blurb follow the outline.
  const shownTitle = title ?? outline?.title ?? '';
  const shownBlurb = blurb ?? (outline ? outlineBlurb(outline) : '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = { title: shownTitle, blurb: shownBlurb, categories };
    const id = outline
      ? adventureFromOutline(ws, outline, steps, input)
      : createAdventure(ws, input);
    onClose();
    void navigate({ to: '/paths/$adventureId', params: { adventureId: id } });
  };

  return (
    <Dialog title="New adventure" onClose={onClose} sec="paths" wide>
      <CustomStructuresSync />
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {outlines.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="label">Start from an outline (optional)</span>
            <select className="txt" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">A blank page</option>
              {outlines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title || 'Untitled story'}
                </option>
              ))}
            </select>
          </label>
        )}
        {outline && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-sunken p-3 text-[0.9rem]">
            {chapterCount > 0 && (
              <div role="group" aria-label="Make a passage for each" className="flex gap-1.5">
                <button
                  type="button"
                  className="seg"
                  aria-pressed={by === 'beats'}
                  onClick={() => setBy('beats')}
                >
                  Each beat
                </button>
                <button
                  type="button"
                  className="seg"
                  aria-pressed={by === 'chapters'}
                  onClick={() => setBy('chapters')}
                >
                  Each chapter
                </button>
              </div>
            )}
            <p className="text-muted">
              {steps.length === 0
                ? 'This outline has nothing to make passages from yet.'
                : `${steps.length} ${steps.length === 1 ? 'passage' : 'passages'} in a line, from “${
                    steps[0]!.title
                  }” to “${steps[steps.length - 1]!.title}”, each leading to the next. The last is an ending. Then branch them however you like.`}
            </p>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="label">Title</span>
          <input
            className="txt"
            autoFocus
            placeholder="Lost in the Ashwood"
            value={shownTitle}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Blurb (optional)</span>
          <textarea
            className="txt"
            rows={2}
            placeholder="The lantern is dying, and every path in the forest looks the same."
            value={shownBlurb}
            onChange={(e) => setBlurb(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="label">Categories (optional)</span>
          <CategoryPicker value={categories} onChange={setCategories} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create adventure
          </button>
        </div>
      </form>
    </Dialog>
  );
}
