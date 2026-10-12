import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { useAuthStore } from '../auth/authStore';
import { createNotebook } from './worldModel';
import { NOTEBOOK_STARTERS } from './worldPresets';

/** Name a notebook and pick what it starts with. */
export function NewNotebookDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starter, setStarter] = useState('world');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = createNotebook(ws, { title, description, starter });
    onClose();
    void navigate({ to: '/world/$notebookId', params: { notebookId: id } });
  };

  return (
    <Dialog title="New notebook" onClose={onClose} sec="world" wide>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <label className="flex flex-col gap-1">
          <span className="label">Name</span>
          <input
            className="txt"
            autoFocus
            placeholder="The Drowned Empire"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">What it’s for (optional)</span>
          <input
            className="txt"
            placeholder="The world of my sea-witch trilogy"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="label mb-1">Start with</legend>
          <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            {NOTEBOOK_STARTERS.map((s) => (
              <label
                key={s.key}
                className={`flex cursor-pointer gap-2 rounded-md border p-2.5 ${
                  starter === s.key ? 'border-accent bg-accent-soft' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="starter"
                  className="sr-only"
                  checked={starter === s.key}
                  onChange={() => setStarter(s.key)}
                />
                <span aria-hidden="true">{s.icon}</span>
                <span className="flex flex-col">
                  <b className="text-[0.92rem]">{s.name}</b>
                  <span className="text-[0.8rem] text-muted">{s.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create notebook
          </button>
        </div>
      </form>
    </Dialog>
  );
}
