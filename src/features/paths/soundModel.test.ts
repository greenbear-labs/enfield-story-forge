import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/types';
import { passageData } from './publishModel';
import { soundAlong, soundOf } from './soundModel';

const p = (sound?: string): Pick<Entry, 'fields'> => ({
  fields: sound === undefined ? {} : { sound },
});

describe('soundOf', () => {
  it('reads an ambience or silence, and nothing else', () => {
    expect(soundOf(p('rain'))).toBe('rain');
    expect(soundOf(p('silence'))).toBe('silence');
    expect(soundOf(p('trumpets'))).toBeNull();
    expect(soundOf(p())).toBeNull();
  });
});

describe('soundAlong', () => {
  const passages = new Map([
    ['a', p('rain')],
    ['b', p()],
    ['c', p('silence')],
    ['d', p('heartbeat')],
  ]);

  it('carries a sound on through passages that keep what was playing', () => {
    expect(soundAlong(['a', 'b'], passages)).toBe('rain');
  });

  it('stops for silence, and changes when a passage asks', () => {
    expect(soundAlong(['a', 'b', 'c'], passages)).toBeNull();
    expect(soundAlong(['a', 'c', 'b', 'd'], passages)).toBe('heartbeat');
  });

  it('is quiet before any passage sets a sound', () => {
    expect(soundAlong([], passages)).toBeNull();
    expect(soundAlong(['b', 'gone'], passages)).toBeNull();
  });
});

describe('publishing', () => {
  it('copies a passage’s sound to the published copy', () => {
    expect(
      passageData({ title: 'x', fields: { sound: 'sea', notes: 'mine' } }, null, null).fields,
    ).toEqual({
      sound: 'sea',
    });
  });
});
