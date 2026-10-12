import { useId, type InputHTMLAttributes } from 'react';
import { ROLE_SUGGESTIONS } from './characterModel';

/** A free-text role with common story roles offered as suggestions. */
export function RoleInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const listId = useId();
  return (
    <>
      <input className="txt" list={listId} placeholder="e.g. Protagonist, mentor" {...props} />
      <datalist id={listId}>
        {ROLE_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </>
  );
}
