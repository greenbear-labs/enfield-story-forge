import { useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { COLUMN_TYPES, type ColumnType, type WorldColumn } from './worldModel';

export interface ColumnDraft {
  name: string;
  type: ColumnType;
  options: string[];
}

/** Add a column, or rename one and edit its choices. A column's kind is set when it's added. */
export function ColumnDialog({
  column,
  onSave,
  onClose,
}: {
  column?: WorldColumn;
  onSave: (draft: ColumnDraft) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(column?.name ?? '');
  const [type, setType] = useState<ColumnType>(column?.type ?? 'text');
  const [options, setOptions] = useState((column?.options ?? []).join(', '));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const choices = [
      ...new Set(
        options
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),
    ];
    onSave({ name, type, options: choices });
    onClose();
  };

  return (
    <Dialog title={column ? 'Edit column' : 'Add a column'} onClose={onClose} sec="world">
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <label className="flex flex-col gap-1">
          <span className="label">Name</span>
          <input
            className="txt"
            autoFocus
            placeholder="Climate, Ruler, Population…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {!column && (
          <fieldset className="flex flex-col gap-1">
            <legend className="label mb-1">Kind</legend>
            <div className="flex flex-wrap gap-1.5">
              {COLUMN_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="seg"
                  aria-pressed={type === t.key}
                  onClick={() => setType(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {type === 'choice' && (
          <label className="flex flex-col gap-1">
            <span className="label">Choices</span>
            <input
              className="txt"
              placeholder="Calm, Stormy, Frozen"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
            <span className="text-[0.8rem] text-muted">Separate them with commas.</span>
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {column ? 'Save' : 'Add column'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
