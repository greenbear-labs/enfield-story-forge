import type { Ambience } from './soundModel';

/**
 * Ambient sound, made in the browser with the Web Audio API: filtered noise
 * for rain, wind, the sea, and fire; oscillators for insects, a hum, and a
 * heartbeat. One plays at a time; changing it fades one into the next.
 * Nothing starts until the reader asks for sound (browsers need a click).
 */

interface Voice {
  out: GainNode;
  stop: () => void;
}

const FADE = 1.5;
let ctx: AudioContext | null = null;
let playing: { key: Ambience; voice: Voice } | null = null;
const noise = new Map<string, AudioBuffer>();

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext as typeof AudioContext | undefined;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** A few seconds of noise to loop: white (hiss) or brown (rumble). */
function noiseBuffer(c: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const have = noise.get(kind);
  if (have) return have;
  const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white') data[i] = white;
    else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  noise.set(kind, buffer);
  return buffer;
}

function build(c: AudioContext, key: Ambience): Voice {
  const out = c.createGain();
  out.gain.value = 0;
  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  const start = <T extends AudioScheduledSourceNode>(node: T): T => {
    sources.push(node);
    node.start();
    return node;
  };
  const loop = (kind: 'white' | 'brown') => {
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(c, kind);
    s.loop = true;
    return start(s);
  };
  const filter = (type: BiquadFilterType, frequency: number, q = 0.7) => {
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    return f;
  };
  const gain = (value: number) => {
    const g = c.createGain();
    g.gain.value = value;
    return g;
  };
  /** A slow wobble added to a value. */
  const lfo = (rate: number, depth: number, target: AudioParam, type: OscillatorType = 'sine') => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = rate;
    o.connect(gain(depth)).connect(target);
    start(o);
  };
  const chain = (...nodes: AudioNode[]) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i]!.connect(nodes[i + 1]!);
  };

  switch (key) {
    case 'rain': {
      chain(loop('white'), filter('highpass', 900), filter('lowpass', 7000), gain(0.18), out);
      break;
    }
    case 'wind': {
      const band = filter('bandpass', 420, 0.9);
      const swell = gain(0.5);
      chain(loop('brown'), band, swell, out);
      lfo(0.07, 260, band.frequency);
      lfo(0.13, 0.3, swell.gain);
      break;
    }
    case 'sea': {
      const waves = gain(0.35);
      chain(loop('brown'), filter('lowpass', 600), waves, out);
      lfo(0.09, 0.3, waves.gain);
      break;
    }
    case 'fire': {
      chain(loop('brown'), filter('lowpass', 280), gain(0.45), out);
      const crackles = filter('highpass', 1800);
      crackles.connect(out);
      timers.push(
        window.setInterval(() => {
          if (Math.random() > 0.35) return;
          const t = c.currentTime + Math.random() * 0.05;
          const s = c.createBufferSource();
          s.buffer = noiseBuffer(c, 'white');
          const pop = c.createGain();
          pop.gain.setValueAtTime(0, t);
          pop.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.35, t + 0.003);
          pop.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.04);
          s.connect(pop).connect(crackles);
          s.start(t, Math.random() * 3, 0.1);
        }, 70),
      );
      break;
    }
    case 'night': {
      // Crickets: a high tone, trilled fast, chirping on and off.
      const tone = c.createOscillator();
      tone.frequency.value = 4400;
      const trill = gain(0.5);
      const chirp = gain(0.5);
      chain(tone, trill, chirp, gain(0.035), out);
      start(tone);
      lfo(28, 0.5, trill.gain, 'square');
      lfo(0.9, 0.5, chirp.gain, 'square');
      chain(loop('brown'), filter('lowpass', 350), gain(0.12), out);
      break;
    }
    case 'drone': {
      const low = filter('lowpass', 380, 2);
      chain(low, gain(0.1), out);
      for (const [f, type] of [
        [55, 'sine'],
        [55.6, 'sine'],
        [82.4, 'triangle'],
      ] as const) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.connect(low);
        start(o);
      }
      lfo(0.05, 160, low.frequency);
      break;
    }
    case 'heartbeat': {
      const low = filter('lowpass', 140);
      low.connect(out);
      const thump = (t: number, level: number) => {
        const o = c.createOscillator();
        o.frequency.setValueAtTime(62, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(level, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(low);
        o.start(t);
        o.stop(t + 0.25);
      };
      const beat = () => {
        const t = c.currentTime + 0.05;
        thump(t, 0.9);
        thump(t + 0.28, 0.6);
      };
      beat();
      timers.push(window.setInterval(beat, 1050));
      break;
    }
  }

  out.connect(c.destination);
  return {
    out,
    stop: () => {
      timers.forEach((t) => window.clearInterval(t));
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          // Already stopped.
        }
      }
      out.disconnect();
    },
  };
}

function fadeOut(c: AudioContext, voice: Voice) {
  const t = c.currentTime;
  voice.out.gain.cancelScheduledValues(t);
  voice.out.gain.setValueAtTime(voice.out.gain.value, t);
  voice.out.gain.linearRampToValueAtTime(0, t + FADE);
  window.setTimeout(voice.stop, FADE * 1000 + 100);
}

/** Plays this ambience (fading from the last), or fades to silence. */
export function playAmbience(key: Ambience | null): void {
  if ((playing?.key ?? null) === key) return;
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  if (playing) fadeOut(c, playing.voice);
  playing = null;
  if (!key) return;
  const voice = build(c, key);
  const t = c.currentTime;
  voice.out.gain.setValueAtTime(0, t);
  voice.out.gain.linearRampToValueAtTime(1, t + FADE);
  playing = { key, voice };
}

/** Whether this browser can make sound at all. */
export const canPlaySound = () => typeof window !== 'undefined' && 'AudioContext' in window;
