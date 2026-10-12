import { SHARD_TYPES, type ShardType } from './shardModel';

/** The shard types as a row of toggle buttons. */
export function ShardTypePicker({
  value,
  onChange,
}: {
  value: ShardType;
  onChange: (type: ShardType) => void;
}) {
  return (
    <div role="group" aria-label="Shard type" className="flex flex-wrap gap-1.5">
      {SHARD_TYPES.map((t) => (
        <button
          key={t.key}
          type="button"
          className="seg"
          aria-pressed={value === t.key}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
