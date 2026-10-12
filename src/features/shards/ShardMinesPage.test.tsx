import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../../data/types';
import { addLink, createEntry } from '../../lib/entries/entries';
import { fakeShard } from '../../test/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { useMineCart } from './mineCart';
import { ShardMinesPage } from './ShardMinesPage';

const data = vi.hoisted(() => ({ entries: [] as Entry[] }));

vi.mock('../../lib/entries/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/entries/hooks')>()),
  useEntries: (type?: string) => ({
    data: data.entries.filter((e) => !type || e.type === type),
    error: undefined,
  }),
}));

vi.mock('../../lib/entries/entries', () => ({
  createEntry: vi.fn(() => 'group-1'),
  addLink: vi.fn(),
}));

describe('ShardMinesPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signedIn', workspaceId: 'u1' });
    useMineCart.setState({ shardIds: [] });
    data.entries = [fakeShard('A drowned bell tower'), fakeShard('A choir of fish')];
  });

  it('forges the shards in the cart into a new group', async () => {
    renderInRouter(<ShardMinesPage />);

    for (const button of await screen.findAllByRole('button', { name: '+ Cart' })) {
      await userEvent.click(button);
    }
    const cart = screen.getByRole('complementary', { name: 'Mine cart' });
    expect(within(cart).getByText('A choir of fish')).toBeVisible();

    await userEvent.type(within(cart).getByRole('textbox', { name: 'Group name' }), 'Underwater');
    await userEvent.click(within(cart).getByRole('button', { name: 'Forge a shard group' }));

    expect(createEntry).toHaveBeenCalledWith('u1', {
      type: 'shard_group',
      title: 'Underwater',
      fields: { note: '' },
    });
    const [a, b] = data.entries;
    expect(addLink).toHaveBeenCalledWith('u1', 'group-1', 'member', b!.id);
    expect(addLink).toHaveBeenCalledWith('u1', 'group-1', 'member', a!.id);
    expect(useMineCart.getState().shardIds).toEqual([]);
  });
});
