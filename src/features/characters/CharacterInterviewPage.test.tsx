import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { CharacterInterviewPage } from './CharacterInterviewPage';

const mira = fakeShard('', {
  id: 'c1',
  type: 'character',
  title: 'Mira',
  fields: { want: 'to get home' },
});

vi.mock('../../lib/entries/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/entries/hooks')>()),
  useEntry: () => ({ data: mira, error: undefined }),
}));

vi.mock('../../lib/entries/entries', () => ({
  updateEntry: vi.fn(),
  createEntry: vi.fn(),
  addLink: vi.fn(),
}));

describe('CharacterInterviewPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signedIn', workspaceId: 'u1' });
    vi.mocked(updateEntry).mockClear();
  });

  it('starts at the first unanswered question and saves answers to the card', async () => {
    renderInRouter(<CharacterInterviewPage characterId="c1" />);
    // "Want" is already filled in, so the interview opens on "Need".
    const need = await screen.findByRole('textbox', {
      name: 'What do you actually need, even if you don’t know it yet?',
    });
    expect(screen.getByText('Question 2 of 16')).toBeInTheDocument();
    await userEvent.type(need, 'to be forgiven');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(updateEntry).toHaveBeenCalledWith('u1', 'c1', {}, { need: 'to be forgiven' });

    // Skipping saves nothing; going back shows what was typed.
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Question 4 of 16')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'The fire');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(updateEntry).toHaveBeenLastCalledWith('u1', 'c1', {}, { 'backstory.wound': 'The fire' });
    expect(updateEntry).toHaveBeenCalledTimes(2);
  });
});
