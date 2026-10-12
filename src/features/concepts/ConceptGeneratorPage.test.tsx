import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntry } from '../../lib/entries/entries';
import { renderInRouter } from '../../test/renderInRouter';
import { useAuthStore } from '../auth/authStore';
import { ConceptGeneratorPage } from './ConceptGeneratorPage';

vi.mock('../../lib/entries/entries', () => ({
  createEntry: vi.fn(() => 'concept-1'),
  addLink: vi.fn(),
}));

describe('ConceptGeneratorPage', () => {
  beforeEach(() => useAuthStore.setState({ status: 'signedIn', workspaceId: 'u1' }));

  it('builds a sentence from one pick per column and saves it', async () => {
    renderInRouter(<ConceptGeneratorPage />);
    const save = await screen.findByRole('button', { name: 'Save to the Concept Bank' });
    expect(save).toBeDisabled();

    const picked: string[] = [];
    for (const name of ['Hero', 'Goal', 'World', 'Ally', 'Enemy', 'Clock']) {
      const column = screen.getByRole('region', { name });
      const box = within(column).getAllByRole('button', { pressed: false })[0]!;
      picked.push(box.textContent!);
      await userEvent.click(box);
      expect(box).toHaveAttribute('aria-pressed', 'true');
    }

    const sentence = screen.getByRole('region', { name: 'Your concept' });
    for (const p of picked) expect(sentence).toHaveTextContent(p);

    await userEvent.type(screen.getByRole('textbox', { name: 'Concept name' }), 'The Salt Key');
    await userEvent.click(save);
    expect(createEntry).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        type: 'concept',
        title: 'The Salt Key',
        status: 'spark',
        fields: expect.objectContaining({ parts: expect.objectContaining({ hero: picked[0] }) }),
      }),
    );
  });
});
