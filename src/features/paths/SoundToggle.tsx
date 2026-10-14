import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { canPlaySound, playAmbience } from './ambience';
import { ambienceLabel, type Ambience } from './soundModel';

const KEY = 'sp-sound';
const saved = () => {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
};

/**
 * Turns the story's ambient sound on or off (off until the reader asks; the
 * choice is remembered on this device). Shown only when the story has sound.
 */
export function SoundToggle({ sound, hasSound }: { sound: Ambience | null; hasSound: boolean }) {
  const [on, setOn] = useState(saved);
  // A remembered "on" still waits for a click on the page: browsers won't play before one.
  const [heard, setHeard] = useState(false);

  useEffect(() => {
    if (!on || heard) return;
    const wake = () => setHeard(true);
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [on, heard]);

  useEffect(() => {
    if (on && heard) playAmbience(sound);
    else playAmbience(null);
  }, [on, heard, sound]);
  useEffect(() => () => playAmbience(null), []);

  if (!hasSound || !canPlaySound()) return null;
  const toggle = () => {
    const next = !on;
    setOn(next);
    setHeard(true);
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      // Not remembered, then.
    }
  };
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      aria-pressed={on}
      title={on && sound ? `Playing: ${ambienceLabel(sound).toLowerCase()}` : undefined}
      onClick={toggle}
    >
      <Icon name={on ? 'sound' : 'mute'} size={16} />
      {on ? 'Sound on' : 'Sound off'}
    </button>
  );
}
