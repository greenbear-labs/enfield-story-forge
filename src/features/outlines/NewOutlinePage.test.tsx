import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry, Link } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { NewOutlinePage } from './NewOutlinePage';

const data = vi.hoisted(() => ({ entries: [] as Entry[], links: [] as Link[] }));

vi.mock('../../lib/entries/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/entries/hooks')>()),
  useEntries: (type?: string) => ({
    data: data.entries.filter((e) => e.type === type),
    error: undefined,
  }),
  useLinks: ({ kind, toId }: { kind?: string; toId?: string }) => ({
    data: data.links.filter((l) => l.kind === kind && (!toId || l.toId === toId)),
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
    vi.mocked(addLink).mockClear();
    data.links = [];
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

  it('turns a character group into a story with the group as its cast', async () => {
    data.entries.push(
      fakeShard('', {
        id: 'g1',
        type: 'cast_group',
        title: 'The Salt Key crew',
        fields: { notes: 'Smugglers who owe the same debt.' },
      }),
      fakeShard('', { id: 'k1', type: 'character', title: 'Ida' }),
      fakeShard('', { id: 'k2', type: 'character', title: 'Tam' }),
      fakeShard('', { id: 'k3', type: 'character', title: 'Mira' }),
    );
    data.links = [
      { id: 'k1__cast__g1', fromId: 'k1', kind: 'cast', toId: 'g1' } as Link,
      { id: 'k2__cast__g1', fromId: 'k2', kind: 'cast', toId: 'g1' } as Link,
    ];
    renderInRouter(<NewOutlinePage groupId="g1" />);
    expect(await screen.findByRole('textbox', { name: 'Working title' })).toHaveValue(
      'The Salt Key crew',
    );
    expect(screen.getByRole('textbox', { name: 'Premise' })).toHaveValue(
      'Smugglers who owe the same debt.',
    );
    const group = screen.getByRole('region', { name: 'From the group' });
    expect(group).toHaveTextContent('Ida');
    expect(group).not.toHaveTextContent('Mira');
    await userEvent.click(screen.getByRole('button', { name: 'Start the outline' }));
    expect(createEntry).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        type: 'book',
        title: 'The Salt Key crew',
        fields: expect.objectContaining({
          start: 'premise',
          spine: { logline: 'Smugglers who owe the same debt.' },
        }),
      }),
    );
    expect(addLink).toHaveBeenCalledWith('u1', 'new-id', 'source', 'g1');
    expect(addLink).toHaveBeenCalledWith('u1', 'k1', 'cast', 'new-id');
    expect(addLink).toHaveBeenCalledWith('u1', 'k2', 'cast', 'new-id');
    expect(addLink).not.toHaveBeenCalledWith('u1', 'k3', 'cast', 'new-id');
  });
});
