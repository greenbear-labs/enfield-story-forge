import { useMemo } from 'react';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { useEntries } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { filterCast } from '../characters/characterModel';
import { SCENE_FIELDS, SCENE_TYPES, sceneText, scenePov } from './deskModel';

/**
 * A scene's setup: Scene or Sequel, point of view, and the card fields. Shared
 * by the scene cards in the Chapter Builder and the Scene Desk's side panel.
 */
export function SceneSetup({ scene, narrow = false }: { scene: Entry; narrow?: boolean }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const characters = useEntries('character');
  const cast = useMemo(() => filterCast(characters.data ?? [], ''), [characters.data]);
  const type = sceneText(scene, 'sceneType') || 'scene';

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="label">Type</span>
          <div role="group" aria-label="Scene type" className="flex gap-1.5">
            {SCENE_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className="seg"
                title={t.hint}
                aria-pressed={type === t.key}
                onClick={() => updateEntry(ws, scene.id, {}, { sceneType: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <label data-sec="char" className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="label">Point of view</span>
          <select
            className="txt"
            value={scenePov(scene) ?? ''}
            onChange={(e) => updateEntry(ws, scene.id, {}, { pov: e.target.value })}
          >
            <option value="">No one chosen</option>
            {cast.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || 'Unnamed character'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={`grid gap-3 ${narrow ? '' : 'grid-cols-2 max-sm:grid-cols-1'}`}>
        {SCENE_FIELDS.map((f) => (
          <SceneField key={f.key} scene={scene} field={f} wide={narrow} />
        ))}
      </div>
    </>
  );
}

function SceneField({
  scene,
  field,
  wide,
}: {
  scene: Entry;
  field: (typeof SCENE_FIELDS)[number];
  wide: boolean;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const value = useAutosaved(sceneText(scene, field.key), (v) =>
    updateEntry(ws, scene.id, {}, { [field.key]: v.trim() }),
  );
  const long = 'long' in field && field.long;
  return (
    <label className={`flex flex-col gap-1 ${long && !wide ? 'sm:col-span-2' : ''}`}>
      <span className="label">{field.label}</span>
      {long ? (
        <textarea
          className="txt field-sizing-content min-h-14"
          placeholder={field.placeholder}
          {...value.props}
        />
      ) : (
        <input className="txt" placeholder={field.placeholder} {...value.props} />
      )}
    </label>
  );
}
