import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '../../test/renderInRouter';
import { StationPage } from './StationPage';
import { charactersStation, shardsStation } from './content';
import { Toaster } from '../../components/ui/Toaster';

describe('StationPage', () => {
  it('renders the header, tools and library', async () => {
    renderInRouter(<StationPage content={shardsStation} />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Story Shards' })).toBeVisible();
    expect(screen.getByText('Station 1 of 4')).toBeVisible();
    expect(screen.getByRole('link', { name: /What is a story shard\?/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/appendix'),
    );

    const tools = screen.getByRole('heading', { name: 'Tools' }).closest('section')!;
    for (const name of ['Create a Shard', 'The Shard Mines', 'Spark Prompts']) {
      expect(within(tools).getByRole('heading', { name })).toBeVisible();
    }

    expect(screen.getByRole('heading', { name: 'Shard groups' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Shard library' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Concepts →' })).toBeVisible();
  });

  it('labels companion workshops and shows a coming-soon toast for tools', async () => {
    renderInRouter(<StationPage content={charactersStation} />);
    render(<Toaster />);

    expect(await screen.findByText('Companion workshop')).toBeVisible();
    expect(screen.getByText('Later')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: /Quick Card/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Quick Card/);
  });
});
