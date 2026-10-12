import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry, Link } from '../../data/types';
import { createEntry } from '../../lib/entries/entries';
import { fakeGroup, fakeShard, memberLink } from '../../test/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { CaptureShardDialog } from './CaptureShardDialog';
import { ShardsStationPage } from './ShardsStationPage';

const data = vi.hoisted(() => ({
  entries: [] as Entry[],
  links: [] as Link[],
}));

vi.mock('../../lib/entries/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/entries/hooks')>()),
  useEntries: (type?: string) => ({
    data: data.entries.filter((e) => !type || e.type === type),
    error: undefined,
  }),
  useLinks: () => ({ data: data.links, error: undefined }),
}));

vi.mock('../../lib/entries/entries', () => ({
  createEntry: vi.fn(() => 'new-id'),
  updateEntry: vi.fn(),
  addLink: vi.fn(),
  removeLink: vi.fn(),
  trashEntry: vi.fn(),
  restoreEntry: vi.fn(),
}));

describe('ShardsStationPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'signedIn', workspaceId: 'u1' });
    vi.mocked(createEntry).mockClear();
    const city = fakeShard('A city that moves at night', { shardType: 'location', tags: ['city'] });
    const sword = fakeShard('A sword that sings', { shardType: 'item' });
    const group = fakeGroup('Night things');
    data.entries = [city, sword, group];
    data.links = [memberLink(group.id, city.id)];
  });

  it('shows the groups and the library, and filters by type and search', async () => {
    renderInRouter(<ShardsStationPage />);

    const groups = (await screen.findByRole('heading', { name: 'Shard groups' })).closest(
      'section',
    )!;
    expect(within(groups).getByText('Night things')).toBeVisible();
    expect(within(groups).getByText('1 shard')).toBeVisible();

    const library = screen.getByRole('heading', { name: 'Shard library' }).closest('section')!;
    expect(within(library).getByText('2 shards')).toBeVisible();

    await userEvent.click(within(library).getByRole('button', { name: 'Item' }));
    expect(within(library).getByText('1 of 2 shards')).toBeVisible();
    expect(within(library).getByText('A sword that sings')).toBeVisible();
    expect(within(library).queryByText('A city that moves at night')).toBeNull();

    await userEvent.click(within(library).getByRole('button', { name: 'All' }));
    await userEvent.type(within(library).getByRole('searchbox'), '#city');
    expect(within(library).getByText('A city that moves at night')).toBeVisible();
    expect(within(library).queryByText('A sword that sings')).toBeNull();
  });

  it('captures a new shard from the Create a Shard tool', async () => {
    renderInRouter(
      <>
        <ShardsStationPage />
        <CaptureShardDialog />
      </>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Create a Shard/ }));
    const dialog = screen.getByRole('dialog', { name: 'New shard' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Shard text' }), 'A key');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Item' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save shard' }));

    expect(createEntry).toHaveBeenCalledWith('u1', {
      type: 'shard',
      title: 'A key',
      fields: { text: 'A key', shardType: 'item' },
      tags: [],
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
