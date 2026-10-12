import { describe, expect, it } from 'vitest';
import { countWords, mentionIds, proseText, proseToMarkdown } from './prose';

const doc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'The tide was ' },
        { type: 'text', text: 'wrong ', marks: [{ type: 'italic' }] },
        { type: 'text', text: 'tonight.' },
      ],
    },
    { type: 'horizontalRule' },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Mira', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' ran.' },
        { type: 'hardBreak' },
        { type: 'text', text: 'Twice.' },
      ],
    },
    { type: 'paragraph' },
  ],
};

describe('prose', () => {
  it('reads plain text', () => {
    expect(proseText(doc)).toBe('The tide was wrong tonight.\n\n* * *\n\nMira ran.\nTwice.\n\n');
  });

  it('writes Markdown, with marks around the words and not the spaces', () => {
    expect(proseToMarkdown(doc)).toBe(
      'The tide was *wrong* tonight.\n\n\\* \\* \\*\n\n**Mira** ran.  \nTwice.',
    );
  });

  it('counts words, not scene breaks or punctuation', () => {
    expect(countWords(proseText(doc))).toBe(8);
    expect(countWords('  ')).toBe(0);
    expect(countWords('— well, it’s 3 a.m. —')).toBe(4);
  });

  it('copes with empty or odd bodies', () => {
    expect(proseText(undefined)).toBe('');
    expect(proseText({ type: 'doc' })).toBe('');
    expect(proseToMarkdown({ type: 'doc', content: [{ nope: true }] })).toBe('');
  });

  it('reads @mentions as names and lists who is mentioned', () => {
    const withMentions = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'c1', label: 'Mira' } },
            { type: 'text', text: ' saw ' },
            { type: 'mention', attrs: { id: 'c2', label: 'Tam' } },
            { type: 'text', text: ' and ' },
            { type: 'mention', attrs: { id: 'c1', label: 'Mira' } },
          ],
        },
      ],
    };
    expect(proseText(withMentions)).toBe('Mira saw Tam and Mira');
    expect(mentionIds(withMentions)).toEqual(['c1', 'c2']);
    expect(mentionIds(doc)).toEqual([]);
  });

  it('writes headings and lists, and moves headings down when asked', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'History' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Founded' }] }],
            },
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Flooded' }] },
                {
                  type: 'orderedList',
                  content: [
                    {
                      type: 'listItem',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'once' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(proseToMarkdown(doc)).toBe('## History\n\n- Founded\n- Flooded\n  1. once');
    expect(proseToMarkdown(doc, 3).split('\n')[0]).toBe('##### History');
    expect(proseText(doc)).toBe('History\n\n• Founded\n• Flooded\n  1. once');
  });
});
