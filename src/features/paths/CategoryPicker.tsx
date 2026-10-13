import { CATEGORIES, toggleCategory } from './pathsModel';

/** The library's categories as toggle buttons. */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (categories: string[]) => void;
}) {
  return (
    <div role="group" aria-label="Categories" className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          className="seg"
          aria-pressed={value.includes(c)}
          onClick={() => onChange(toggleCategory(value, c))}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
