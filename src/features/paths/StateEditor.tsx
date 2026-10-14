import { Icon } from '../../components/ui/Icon';
import type { Entry } from '../../data/types';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import type { Choice } from './pathsModel';
import {
  addLine,
  addRule,
  addVar,
  COND_OPS,
  EFFECT_OPS,
  firstCondOp,
  firstEffectOp,
  linesOf,
  removeLine,
  removeRule,
  removeVar,
  storyVars,
  updateLine,
  updateRule,
  updateVar,
  VAR_KINDS,
  varName,
  type Line,
  type Rule,
  type StoryVar,
  type VarKind,
} from './stateModel';

/** The adventure's items, flags, and counters: add, name, and remove them. */
export function StoryStateEditor({ adventure }: { adventure: Entry }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const vars = storyVars(adventure);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.88rem] text-muted">
        Things the story keeps track of while it’s played. A choice can need one (only open if you
        carry the lantern) or change one (pick up the lantern). A passage can have lines that only
        show sometimes.
      </p>
      {vars.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {vars.map((v) => (
            <VarRow key={v.id} adventureId={adventure.id} v={v} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {VAR_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            className="btn btn-small"
            title={k.blurb}
            onClick={() => addVar(ws, adventure, k.key)}
          >
            + {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function VarRow({ adventureId, v }: { adventureId: string; v: StoryVar }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const name = useAutosaved(v.name, (value) =>
    updateVar(ws, adventureId, v.id, { name: value.trim() }),
  );
  const kind = VAR_KINDS.find((k) => k.key === v.kind)!;
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-sunken px-2.5 py-1.5">
      <span className="chip w-[72px] justify-center" title={kind.blurb}>
        {kind.label}
      </span>
      <input
        className="txt min-w-[120px] flex-1 py-1"
        aria-label={`${kind.label} name`}
        placeholder={
          v.kind === 'item' ? 'the lantern' : v.kind === 'flag' ? 'met the witch' : 'Courage'
        }
        autoFocus={!v.name}
        {...name.props}
      />
      {v.kind === 'counter' && (
        <label className="flex items-center gap-1.5 text-[0.85rem]">
          <span className="text-muted">starts at</span>
          <input
            type="number"
            className="txt w-[72px] py-1"
            value={v.start}
            onChange={(e) =>
              updateVar(ws, adventureId, v.id, { start: Math.round(Number(e.target.value)) || 0 })
            }
          />
        </label>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Remove ${varName(v)}`}
        onClick={() => removeVar(ws, adventureId, v.id)}
      >
        <Icon name="close" size={16} />
      </button>
    </li>
  );
}

/**
 * One need or change: which thing, what about it, and (for a counter) how
 * much. Picking a different thing starts it over with that kind's first option.
 */
function RuleFields({
  vars,
  rule,
  ops,
  first,
  onChange,
  onRemove,
  noun,
}: {
  vars: StoryVar[];
  rule: Pick<Rule<string>, 'var' | 'op' | 'value'>;
  ops: Record<VarKind, readonly { key: string; label: string }[]>;
  first: (kind: VarKind) => string;
  onChange: (change: { var?: string; op?: string; value?: number }) => void;
  onRemove: () => void;
  noun: string;
}) {
  const v = vars.find((x) => x.id === rule.var);
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <select
        className="txt w-auto min-w-0 max-w-[160px] py-0.5"
        aria-label={`${noun}: what`}
        value={rule.var}
        onChange={(e) => {
          const next = vars.find((x) => x.id === e.target.value);
          if (next) onChange({ var: next.id, op: first(next.kind) });
        }}
      >
        {!v && <option value={rule.var}>(deleted)</option>}
        {vars.map((x) => (
          <option key={x.id} value={x.id}>
            {varName(x)}
          </option>
        ))}
      </select>
      {v && (
        <select
          className="txt w-auto min-w-0 py-0.5"
          aria-label={`${noun}: how`}
          value={rule.op}
          onChange={(e) => onChange({ op: e.target.value })}
        >
          {ops[v.kind].map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {v?.kind === 'counter' && (
        <input
          type="number"
          className="txt w-[64px] py-0.5"
          aria-label={`${noun}: amount`}
          value={rule.value}
          onChange={(e) => onChange({ value: Math.round(Number(e.target.value)) || 0 })}
        />
      )}
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Remove this ${noun.toLowerCase()}`}
        onClick={onRemove}
      >
        <Icon name="close" size={14} />
      </button>
    </span>
  );
}

/** What a choice needs, and what taking it changes. */
export function ChoiceRules({
  passage,
  choice,
  vars,
}: {
  passage: Entry;
  choice: Choice;
  vars: StoryVar[];
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const first = vars[0];
  if (!first) return null;
  const lists = [
    { key: 'requires', label: 'Needs', noun: 'Need', rules: choice.requires, ops: COND_OPS },
    { key: 'effects', label: 'Changes', noun: 'Change', rules: choice.effects, ops: EFFECT_OPS },
  ] as const;
  return (
    <div className="flex flex-col gap-1 text-[0.85rem]">
      {lists.map((list) => (
        <div key={list.key} className="flex flex-wrap items-center gap-1.5">
          <span className="w-[64px] flex-none text-muted">{list.label}</span>
          {list.rules.map((r) => (
            <RuleFields
              key={r.id}
              vars={vars}
              rule={r}
              ops={list.ops}
              first={list.key === 'requires' ? firstCondOp : firstEffectOp}
              noun={list.noun}
              onChange={(change) => updateRule(ws, passage.id, choice.id, list.key, r.id, change)}
              onRemove={() => removeRule(ws, passage.id, choice.id, list.key, r.id)}
            />
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => addRule(ws, passage, choice.id, list.key, first)}
          >
            + {list.noun}
          </button>
        </div>
      ))}
    </div>
  );
}

/** A passage's lines that only show when something is true. */
export function PassageLines({ passage, vars }: { passage: Entry; vars: StoryVar[] }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const first = vars[0];
  if (!first) return null;
  const lines = linesOf(passage);
  return (
    <section className="flex flex-col gap-2" aria-label="Lines that show only sometimes">
      <span className="label">Lines that show only sometimes</span>
      {lines.map((l) => (
        <LineRow key={l.id} passageId={passage.id} line={l} vars={vars} />
      ))}
      <button
        type="button"
        className="btn btn-small self-start"
        onClick={() => addLine(ws, passage, first)}
      >
        + A line that shows only if…
      </button>
    </section>
  );
}

function LineRow({ passageId, line, vars }: { passageId: string; line: Line; vars: StoryVar[] }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const text = useAutosaved(line.text, (value) =>
    updateLine(ws, passageId, line.id, { text: value.trim() }),
  );
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line bg-sunken p-2 text-[0.85rem]">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted">Only if</span>
        <RuleFields
          vars={vars}
          rule={line.when ?? { var: '', op: '', value: 0 }}
          ops={COND_OPS}
          first={firstCondOp}
          noun="Line"
          onChange={(change) => updateLine(ws, passageId, line.id, change)}
          onRemove={() => removeLine(ws, passageId, line.id)}
        />
      </span>
      <textarea
        className="txt"
        rows={2}
        aria-label="Line text"
        placeholder="The witch’s lantern flickers in recognition."
        {...text.props}
      />
    </div>
  );
}
