import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { toast } from '../../components/ui/toast';
import { useAuthStore } from '../auth/authStore';
import { addToCast } from './castModel';
import { createCharacter } from './characterModel';
import { RoleInput } from './RoleInput';

/** The core card in under a minute: name, role, want, need. */
export function QuickCardDialog({
  onClose,
  storyId = null,
}: {
  onClose: () => void;
  /** Adds them to this story's cast too. */
  storyId?: string | null;
}) {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [want, setWant] = useState('');
  const [need, setNeed] = useState('');

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    if (!ws || !name.trim()) return;
    const id = createCharacter(ws, { name, values: { role, want, need } });
    if (storyId) addToCast(ws, id, storyId);
    onClose();
    toast(`${name.trim()} joined the cast.`, {
      action: {
        label: 'Open',
        onClick: () =>
          void navigate({ to: '/characters/$characterId', params: { characterId: id } }),
      },
    });
  };

  return (
    <Dialog title="Quick Card" sec="char" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="label">Name</span>
          <input
            className="txt"
            placeholder="What do people call them?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Role</span>
          <RoleInput value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Want</span>
          <input
            className="txt"
            placeholder="What they’re chasing"
            value={want}
            onChange={(e) => setWant(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Need</span>
          <input
            className="txt"
            placeholder="What would actually make them whole"
            value={need}
            onChange={(e) => setNeed(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Add to the cast
          </button>
          <span className="text-[0.78rem] text-muted max-sm:hidden">Ctrl + Enter saves</span>
        </div>
      </form>
    </Dialog>
  );
}
