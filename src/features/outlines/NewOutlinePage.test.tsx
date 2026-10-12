import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { NewOutlinePage } from './NewOutlinePage';

const data = vi.hoisted(() => ({ entries: [] as Entry[] }));

vi.mock('../../lib/entries/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/entries/hooks')>()),
  useEntries: (type?: string) => ({
    data: data.entries.filter((e) => e.type === type),
    error: undefined,
  }),
}));

vi.mock('../../lib/entries/entries', () => ({
  createEntry: vi.fn(() => 'new-id'),
  addLink: vi.fn(),
}));

describe('NewOutlinePage', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signedIn', workspaceId: 'u1' });
    vi.mocked(createEntry).mockClear();
    data.entries = [
      fakeShard('', {
        id: 'c1',
        type: 'concept',
        title: 'The Salt Key',
        fields: { logline: 'A thief steals the sea.' },
      }),
    ];
  });

  it('starts from a concept with the Monomyth preselected', async () => {
    renderInRouter(<NewOutlinePage conceptId="c1" />);
    expect(await screen.findByRole('textbox', { name: 'Working title' })).toHaveValue(
      'The Salt Key',
    );
    expect(screen.getByRole('button', { name: /Hero’s Journey \(Monomyth\)/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start the outline' }));
    expect(createEntry).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        type: 'book',
        title: 'The Salt Key',
        parentId: null,
        fields: expect.objectContaining({
          structure: 'monomyth',
          start: 'concept',
          spine: { logline: 'A thief steals the sea.' },
        }),
      }),
    );
    expect(addLink).toHaveBeenCalledWith('u1', 'new-id', 'source', 'c1');
  });

  it('starts theme-first in a new series', async () => {
    renderInRouter(<NewOutlinePage />);
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Theme question' }),
      'Is safety worth freedom?',
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Series' }), 'new');
    const start = screen.getByRole('button', { name: 'Start the outline' });
    expect(start).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'New series name' }), 'Tides');
    await userEvent.click(screen.getByRole('button', { name: /Save the Cat/ }));
    await userEvent.click(start);
    expect(createEntry).toHaveBeenNthCalledWith(1, 'u1', { type: 'series', title: 'Tides' });
    expect(createEntry).toHaveBeenNthCalledWith(
      2,
      'u1',
      expect.objectContaining({
        parentId: 'new-id',
        fields: expect.objectContaining({
          structure: 'save-the-cat',
          start: 'theme',
          spine: { themeQuestion: 'Is safety worth freedom?' },
        }),
      }),
    );
  });
});
