import { useNavigate } from '@tanstack/react-router';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { useAuthStore } from '../auth/authStore';
import {
  DRAFT_ACCEPT,
  draftScenes,
  draftWords,
  importDraft,
  readDraftFile,
  type Draft,
} from './importModel';

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/** Brings a draft in from Word, Markdown, or text, as a new manuscript on the Desk. */
export function ImportDraftDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReading(true);
    setError('');
    setDraft(null);
    try {
      const read = await readDraftFile(file);
      if (!draftScenes(read)) throw new Error('There’s no writing in that file to bring in.');
      setDraft(read);
      setTitle(read.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t read that file.');
    } finally {
      setReading(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!ws || !draft) return;
    const bookId = importDraft(ws, draft, title);
    onClose();
    toast(`${title.trim() || draft.title} is on your Desk.`);
    void navigate({ to: '/desk/$bookId', params: { bookId } });
  };

  const shown = draft?.chapters.slice(0, 8) ?? [];
  return (
    <Dialog title="Import a draft" sec="desk" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={save}>
        <p className="text-[0.9rem] text-muted">
          Bring in writing you already have. Headings (or lines like “Chapter 3”) become chapters,
          and scene breaks like <span className="whitespace-nowrap">* * *</span> start new scenes.
        </p>
        <label className="flex flex-col gap-1">
          <span className="label">Word, Markdown, or text file</span>
          <input
            type="file"
            accept={DRAFT_ACCEPT}
            className="txt file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:font-semibold file:text-accent"
            onChange={(e) => void choose(e)}
          />
        </label>
        {reading && <p className="text-[0.9rem] text-muted">Reading…</p>}
        {error && (
          <p role="alert" className="text-[0.9rem] text-accent">
            {error}
          </p>
        )}
        {draft && (
          <>
            <label className="flex flex-col gap-1">
              <span className="label">Title</span>
              <input className="txt" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="flex flex-col gap-1.5 rounded-lg bg-sunken p-3">
              <p className="text-[0.9rem] font-semibold">
                {plural(draft.chapters.length, 'chapter')}, {plural(draftScenes(draft), 'scene')},{' '}
                {plural(draftWords(draft), 'word')}
              </p>
              <ul className="flex flex-col gap-0.5 text-[0.85rem] text-muted">
                {shown.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="flex-none">{plural(c.scenes.length, 'scene')}</span>
                  </li>
                ))}
                {draft.chapters.length > shown.length && (
                  <li>and {plural(draft.chapters.length - shown.length, 'more chapter')}</li>
                )}
              </ul>
            </div>
            <p className="text-[0.82rem] text-muted">
              It becomes a new outline and manuscript. Your file isn’t changed, and imported words
              don’t count toward today’s goal.
            </p>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!draft}>
            <Icon name="upload" size={16} />
            Import to the Desk
          </button>
        </div>
      </form>
    </Dialog>
  );
}
