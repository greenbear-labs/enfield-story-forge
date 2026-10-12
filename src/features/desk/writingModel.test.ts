import { describe, expect, it } from 'vitest';
import { dayKey, lastDays, metGoal, parseGoal, percent, shiftDay, streak } from './writingModel';

const days = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('writing days', () => {
  it('keys days by local date and steps across months and years', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('counts a day toward the goal, or any words with no goal', () => {
    expect(metGoal(500, 500)).toBe(true);
    expect(metGoal(499, 500)).toBe(false);
    expect(metGoal(1, 0)).toBe(true);
    expect(metGoal(-20, 0)).toBe(false);
  });

  it('keeps a streak alive until today is over', () => {
    const log = days({ '2026-10-09': 600, '2026-10-10': 500, '2026-10-11': 700 });
    expect(streak(log, 500, '2026-10-12')).toEqual({ current: 3, best: 3, today: false });
    log.set('2026-10-12', 520);
    expect(streak(log, 500, '2026-10-12')).toEqual({ current: 4, best: 4, today: true });
    expect(streak(log, 500, '2026-10-14').current).toBe(0);
  });

  it('remembers the best run', () => {
    const log = days({
      '2026-09-01': 900,
      '2026-09-02': 900,
      '2026-09-03': 900,
      '2026-09-04': 100,
      '2026-10-11': 900,
    });
    expect(streak(log, 500, '2026-10-12')).toEqual({ current: 1, best: 3, today: false });
  });

  it('lists the last days oldest first, with empty days as zero', () => {
    expect(lastDays(days({ '2026-10-11': 40 }), 3, '2026-10-12')).toEqual([
      { date: '2026-10-10', words: 0 },
      { date: '2026-10-11', words: 40 },
      { date: '2026-10-12', words: 0 },
    ]);
  });

  it('reads goals from text', () => {
    expect(parseGoal('1,000')).toBe(1000);
    expect(parseGoal(' 80 000 ')).toBe(80000);
    expect(parseGoal('')).toBe(0);
    expect(parseGoal('lots')).toBe(0);
    expect(parseGoal('-5')).toBe(0);
  });

  it('clamps percentages', () => {
    expect(percent(250, 500)).toBe(50);
    expect(percent(900, 500)).toBe(100);
    expect(percent(-3, 500)).toBe(0);
    expect(percent(5, 0)).toBe(0);
  });
});
