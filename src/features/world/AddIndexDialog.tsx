import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { useAuthStore } from '../auth/authStore';
import { addIndex } from './worldModel';
import { CUSTOM_PRESET, INDEX_PRESETS, type IndexPreset } from './worldPresets';

/** Pick a ready-made index, or name your own. */
export function AddIndexDialog({
  notebookId,
  onClose,
}: {
  notebookId: string;
  onClose: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const add = (preset: IndexPreset, title?: string) => {
    const id = addIndex(ws, notebookId, preset, title);
    onClose();
    void navigate({ to: '/world/index/$indexId', params: { indexId: id } });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) add(CUSTOM_PRESET, name);
  };

  return (
    <Dialog title="Add an index" onClose={onClose} sec="world" wide>
      <form className="flex flex-col gap-1" onSubmit={submit}>
        <label className="label" htmlFor="custom-index">
          Your own
        </label>
        <div className="flex gap-2">
          <input
            id="custom-index"
            className="txt min-w-0 flex-1"
            autoFocus
            placeholder="Ships, Gods, Recipes, Songs…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary flex-none" disabled={!name.trim()}>
            Add
          </button>
        </div>
      </form>
      <div className="flex flex-col gap-1.5">
        <span className="label">Or a ready-made one</span>
        <ul className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
          {INDEX_PRESETS.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                className="flex w-full gap-2 rounded-md border border-line p-2.5 text-left hover:border-accent"
                onClick={() => add(p)}
              >
                <span aria-hidden="true">{p.icon}</span>
                <span className="flex flex-col">
                  <b className="text-[0.92rem]">{p.name}</b>
                  <span className="text-[0.8rem] text-muted">{p.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
