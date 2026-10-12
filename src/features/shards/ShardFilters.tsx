import { Icon } from '../../components/ui/Icon';
import { SHARD_TYPES, type ShardType } from './shardModel';

export interface ShardFilterState {
  query: string;
  type: ShardType | null;
}

/** Search box and type filter for a list of shards. */
export function ShardFilters({
  value,
  onChange,
  label = 'Search shards',
}: {
  value: ShardFilterState;
  onChange: (next: ShardFilterState) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex items-center">
        <span className="sr-only">{label}</span>
        <Icon name="search" className="pointer-events-none absolute left-2.5 text-muted" />
        <input
          type="search"
          className="txt pl-8"
          placeholder="Search text and #tags"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </label>
      <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="seg"
          aria-pressed={value.type === null}
          onClick={() => onChange({ ...value, type: null })}
        >
          All
        </button>
        {SHARD_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className="seg"
            aria-pressed={value.type === t.key}
            onClick={() => onChange({ ...value, type: value.type === t.key ? null : t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
