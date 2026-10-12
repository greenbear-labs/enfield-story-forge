import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '../../test/renderInRouter';
import { STRUCTURES } from '../outlines/structures';
import {
  charactersStation,
  conceptsStation,
  deskStation,
  outlinesStation,
  shardsStation,
} from '../stations/content';
import { AppendixPage } from './AppendixPage';
import { ARTICLE_GROUPS, ARTICLES, articleFor } from './articles';

describe('Appendix articles', () => {
  it('has an article for every (i) link in the app', () => {
    const topics = [
      ...[shardsStation, conceptsStation, outlinesStation, deskStation, charactersStation].map(
        (s) => s.infoLabel,
      ),
      ...STRUCTURES.map((s) => s.name),
      'How Story Forge works',
      'The Story Spine',
      'The theme-first, ending-first method',
      'Character arcs',
    ];
    for (const t of topics) expect(articleFor(t), t).toBeDefined();
  });

  it('only links to articles that exist, and every article has a known group', () => {
    for (const a of ARTICLES) {
      expect(ARTICLE_GROUPS).toContain(a.group);
      for (const [, title] of a.body.matchAll(/\[\[(.+?)\]\]/g)) {
        expect(articleFor(title), `${a.title} → ${title}`).toBeDefined();
      }
    }
    expect(new Set(ARTICLES.map((a) => a.title)).size).toBe(ARTICLES.length);
  });

  it('renders an article with headings, lists, and links', async () => {
    renderInRouter(<AppendixPage topic="Story structures explained" />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Story structures explained' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Which one fits?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Save the Cat' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(5);
  });

  it('shows the index, with a note for a topic not written yet', async () => {
    renderInRouter(<AppendixPage topic="Something new" />);
    expect(await screen.findByText('This article is still being written.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Characters' })).toBeInTheDocument();
  });
});
