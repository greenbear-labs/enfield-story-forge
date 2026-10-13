import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { useAuthStore } from '../auth/authStore';
import { CategoryPicker } from './CategoryPicker';
import { createAdventure } from './pathsModel';

/** Name a new adventure, then open it. */
export function NewAdventureDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = createAdventure(ws, { title, blurb, categories });
    onClose();
    void navigate({ to: '/paths/$adventureId', params: { adventureId: id } });
  };

  return (
    <Dialog title="New adventure" onClose={onClose} sec="paths" wide>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <label className="flex flex-col gap-1">
          <span className="label">Title</span>
          <input
            className="txt"
            autoFocus
            placeholder="Lost in the Ashwood"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Blurb (optional)</span>
          <textarea
            className="txt"
            rows={2}
            placeholder="The lantern is dying, and every path in the forest looks the same."
            value={blurb}
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
