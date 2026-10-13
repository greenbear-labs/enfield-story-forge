import { describe, expect, it } from 'vitest';
import { feedbackData, MAX_FEEDBACK } from './feedback';

describe('feedbackData', () => {
  it('keeps only what the rules allow, as a new note', () => {
    const data = feedbackData(
      { uid: 'u1', displayName: 'Sam', email: 'sam@example.com' },
      { kind: 'idea', message: '  More dice!  ', page: '/concepts', device: 'Firefox' },
    );
    expect(data).toEqual({
      uid: 'u1',
      name: 'Sam',
      email: 'sam@example.com',
      kind: 'idea',
      message: 'More dice!',
      page: '/concepts',
      device: 'Firefox',
      status: 'new',
    });
  });

  it('fills blanks and caps long text', () => {
    const data = feedbackData(
      { uid: 'u2', displayName: null, email: null },
      { kind: 'problem', message: 'x'.repeat(MAX_FEEDBACK + 50) },
    );
    expect(data.name).toBe('');
    expect(data.email).toBe('');
    expect(data.page).toBe('');
    expect(data.device).toBe('');
    expect(data.message).toHaveLength(MAX_FEEDBACK);
  });
});
