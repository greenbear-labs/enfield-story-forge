import { useState } from 'react';
import type { FieldValue } from '../../data/types';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { displayValue, parseValue, setProp, type WorldColumn } from './worldModel';

/**
 * One value of a page, edited in place: in a table cell (`compact`) or on
 * the page itself. Text saves a moment after you stop typing; choices and
 * checkboxes save at once.
 */
export function PropField({
  pageId,
  column,
  value,
  label,
  compact,
}: {
  pageId: string;
  column: WorldColumn;
  value: FieldValue | undefined;
  label: string;
  compact?: boolean;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const save = (v: FieldValue) => setProp(ws, pageId, column.id, v);
  const cls = compact ? 'cell-input' : 'txt';

  if (column.type === 'check')
    return <CheckField value={value === true} save={save} label={label} />;
  if (column.type === 'choice')
    return (
      <ChoiceField
        value={typeof value === 'string' ? value : ''}
        options={column.options}
        save={save}
        label={label}
        className={cls}
      />
    );
  return (
    <TextField
      initial={displayValue(column, value)}
      save={(text) => save(parseValue(column.type, text))}
      label={label}
      className={cls}
      inputMode={column.type === 'number' ? 'decimal' : undefined}
      placeholder={compact ? '' : column.type === 'tags' ? 'Comma, separated, tags' : ''}
    />
  );
}

function TextField({
  initial,
  save,
  label,
  className,
  inputMode,
  placeholder,
}: {
  initial: string;
  save: (text: string) => void;
  label: string;
  className: string;
  inputMode?: 'decimal';
  placeholder: string;
}) {
  const field = useAutosaved(initial, save);
  return (
    <input
      className={className}
      aria-label={label}
      inputMode={inputMode}
      placeholder={placeholder}
      {...field.props}
    />
  );
}

// Choices and checkboxes keep their own state, so a tap shows at once.
function ChoiceField({
  value,
  options,
  save,
  label,
  className,
}: {
  value: string;
  options: string[];
  save: (v: string) => void;
  label: string;
  className: string;
}) {
  const [picked, setPicked] = useState(value);
  // A value that's no longer one of the choices still shows.
  const all = picked && !options.includes(picked) ? [...options, picked] : options;
  return (
    <select
      className={className}
      aria-label={label}
      value={picked}
      onChange={(e) => {
        setPicked(e.target.value);
        save(e.target.value);
      }}
    >
      <option value="">—</option>
      {all.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function CheckField({
  value,
  save,
  label,
}: {
  value: boolean;
  save: (v: boolean) => void;
  label: string;
}) {
  const [on, setOn] = useState(value);
  return (
    <input
      type="checkbox"
      className="size-4 accent-[var(--accent)]"
      aria-label={label}
      checked={on}
      onChange={(e) => {
        setOn(e.target.checked);
        save(e.target.checked);
      }}
    />
  );
}
