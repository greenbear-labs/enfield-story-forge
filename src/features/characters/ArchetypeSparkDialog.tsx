import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import { useAuthStore } from '../auth/authStore';
import { rerollRow, rollSpark, sparkValues, SPARK_ROWS } from './archetypePools';
import { createCharacter } from './characterModel';

/** A random role, flaw, wound, and want. Re-roll any row, then make it a character. */
export function ArchetypeSparkDialog({ onClose }: { onClose: () => void }) {
  const ws = useAuthStore((s) => s.workspaceId);
  const navigate = useNavigate();
  const [spark, setSpark] = useState(() => rollSpark());
  const [name, setName] = useState('');

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!ws) return;
    const id = createCharacter(ws, { name, values: sparkValues(spark) });
    onClose();
    toast('Added to the cast.');
    void navigate({ to: '/characters/$characterId', params: { characterId: id } });
  };

  return (
    <Dialog title="Archetype Spark" sec="char" onClose={onClose} wide>
      <p className="text-[0.9rem] text-muted">
        A starting point, not a verdict. Re-roll any line until someone interesting shows up.
      </p>
      <dl aria-label="Your spark" className="flex flex-col gap-2">
        {SPARK_ROWS.map((row) => (
          <div
            key={row.key}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
          >
            <dt className="label w-16 flex-none">{row.label}</dt>
            <dd className="min-w-0 flex-1 font-display text-[1.05rem]" aria-live="polite">
              {spark[row.key]}
            </dd>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label={`Re-roll ${row.label.toLowerCase()}`}
              title={`Re-roll ${row.label.toLowerCase()}`}
              onClick={() => setSpark((s) => rerollRow(s, row.key))}
            >
              <Icon name="dice" size={16} />
            </button>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="btn btn-small self-start"
        onClick={() => setSpark(rollSpark())}
      >
        <Icon name="dice" size={14} /> Roll all four
      </button>
      <form className="flex flex-wrap items-center gap-2 border-t border-line pt-3" onSubmit={save}>
        <label className="min-w-[180px] flex-1">
          <span className="sr-only">Character name</span>
          <input
            className="txt"
            placeholder="Name them (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Make this character
        </button>
      </form>
    </Dialog>
  );
}
