import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { useAuthStore } from '../auth/authStore';
import { outlineStructure } from '../outlines/outlineModel';
import { beatsByChapter, sendToDesk, suggestedChapters } from './deskModel';

/** Choose how many chapters, see where the beats land, and send the outline to the Desk. */
export function SendToDeskDialog({ outline, onClose }: { outline: Entry; onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [count, setCount] = useState(String(suggestedChapters(outline)));
  const n = Number(count);
  const valid = Number.isInteger(n) && n >= 1 && n <= 200;
  const structure = outlineStructure(outline);
  const names = new Map(structure.beats.map((b) => [b.key, b.name]));
  const placed = valid
    ? beatsByChapter(outline, n).flatMap((keys, i) =>
        keys.length ? [{ chapter: i + 1, beats: keys.map((k) => names.get(k)!) }] : [],
      )
    : [];

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    sendToDesk(ws, outline, n);
    onClose();
    toast(`${n} ${n === 1 ? 'chapter' : 'chapters'} ready on the Writer’s Desk.`);
    void navigate({ to: '/desk/$bookId', params: { bookId: outline.id } });
  };

  return (
    <Dialog title="Send to the Writer’s Desk" sec="desk" onClose={onClose} wide>
      <form className="flex flex-col gap-3" onSubmit={send}>
        <p className="text-[0.9rem] text-muted">
          Your outline becomes a manuscript. Each {structure.name} beat is placed in the chapter
          where it lands, so you can see what each chapter needs to do.
        </p>
        <label className="flex w-[180px] flex-col gap-1">
          <span className="label">Chapters</span>
          <input
            className="txt"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        {valid ? (
          <ul
            aria-label="Where the beats land"
            className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-2.5 text-[0.85rem]"
          >
            {placed.map((p) => (
              <li key={p.chapter}>
                <span className="font-semibold">Chapter {p.chapter}:</span> {p.beats.join(', ')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.85rem] text-muted">Choose between 1 and 200 chapters.</p>
        )}
        <div>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            Create {valid ? n : ''} {n === 1 ? 'chapter' : 'chapters'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
