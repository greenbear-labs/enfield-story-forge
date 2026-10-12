import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { MashupPage } from './MashupPage';

const data = vi.hoisted(() => ({ entries: [] as Entry[] }));

vi.mock('../../lib/entries/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/entries/hooks')>()),
  useEntries: () => ({ data: data.entries, error: undefined }),
}));

vi.mock('../../lib/entries/entries', () => ({
  createEntry: vi.fn(() => 'mashed'),
  addLink: vi.fn(),
}));

const parts = (hero: string, world: string) => ({
  logline: '',
  parts: { hero, goal: 'wants to go home', world, enemy: 'a storm', clock: 'before dawn' },
});

describe('MashupPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signedIn', workspaceId: 'u1' });
    const older = fakeShard('', {
      type: 'concept',
      title: 'Knight',
      fields: parts('exiled knight', 'a drowned empire'),
    });
    const newer = fakeShard('', {
      type: 'concept',
      title: 'Oracle',
      fields: parts('teenage oracle', 'an endless library'),
    });
    data.entries = [older, newer];
  });

  it('mixes rows from both sides and saves a concept linked to both', async () => {
    renderInRouter(<MashupPage />);

    const hero = await screen.findByRole('group', { name: 'Hero' });
    await userEvent.click(within(hero).getByRole('button', { name: /exiled knight/ }));
    const world = screen.getByRole('group', { name: 'World' });
    await userEvent.click(within(world).getByRole('button', { name: /endless library/ }));
    await userEvent.type(
      within(screen.getByRole('group', { name: 'Hook' })).getByRole('textbox'),
      'But the library is alive.',
    );

    const draft = screen.getByRole('form', { name: 'Your new concept' });
    const logline = within(draft).getByRole('textbox', { name: 'Logline' });
    expect(logline).toHaveValue(
      'An exiled knight wants to go home in an endless library, to defeat a storm before dawn. But the library is alive.',
    );

    await userEvent.click(within(draft).getByRole('button', { name: 'Save to the Concept Bank' }));
    expect(createEntry).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        type: 'concept',
        fields: expect.objectContaining({ logline: expect.stringContaining('endless library') }),
      }),
    );
    expect(addLink).toHaveBeenCalledTimes(2);
  });
});
