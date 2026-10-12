import { useState, type KeyboardEvent } from 'react';
import { normalizeTags } from '../../lib/entries/model';
import { Icon } from './Icon';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  id?: string;
}

/** Tags as chips. Type and press Enter or a comma to add one. */
export function TagInput({ tags, onChange, id }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    if (!draft.trim()) return;
    onChange(normalizeTags([...tags, ...draft.split(',')]));
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="txt flex flex-wrap items-center gap-1.5 py-1.5">
      {tags.map((tag) => (
        <span key={tag} className="chip">
          #{tag}
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-accent"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
          >
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="min-w-[8ch] flex-1 border-0 bg-transparent p-0 outline-none"
        placeholder={tags.length ? '' : 'Add tags…'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  );
}
