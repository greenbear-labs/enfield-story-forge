import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { Entry } from '../../data/types';
import { useAuthStore } from '../auth/authStore';
import { canPlaySound, playAmbience } from './ambience';
import { AMBIENCES, setSound, soundOf, type PassageSound as Sound } from './soundModel';

/** The sound under a passage: an ambience, silence, or whatever was already playing. */
export function PassageSound({ passage }: { passage: Pick<Entry, 'id' | 'fields'> }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const sound = soundOf(passage);
  const [listening, setListening] = useState(false);
  const preview = listening && sound && sound !== 'silence' ? sound : null;

  useEffect(() => {
    playAmbience(preview);
  }, [preview]);
  useEffect(() => () => playAmbience(null), []);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="label">Sound</span>
        <select
          className="txt"
          value={sound ?? ''}
          onChange={(e) => setSound(ws, passage.id, (e.target.value || null) as Sound | null)}
        >
          <option value="">Keep what was playing</option>
          <option value="silence">Silence</option>
          {AMBIENCES.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      {canPlaySound() && sound && sound !== 'silence' && (
        <button
          type="button"
          className="btn btn-small"
          aria-pressed={listening}
          onClick={() => setListening((l) => !l)}
        >
          <Icon name={listening ? 'mute' : 'sound'} size={16} />
          {listening ? 'Stop' : 'Listen'}
        </button>
      )}
    </div>
  );
}
