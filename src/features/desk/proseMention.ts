import Mention from '@tiptap/extension-mention';
import type { MentionItem } from './MentionList';
import { matchItems, suggestionPopup } from './suggestionPopup';

/**
 * @mentions: type "@" and pick from `getItems` (your cast, or more). A mention
 * reads as the plain name in the text, the export, and the word count.
 * `getItems` is read on every keystroke, so the list stays current.
 */
export function proseMention(
  getItems: () => MentionItem[],
  popup: Parameters<typeof suggestionPopup>[0] = {},
) {
  return Mention.configure({
    HTMLAttributes: { class: 'mention' },
    renderText: ({ node }) => String(node.attrs.label ?? ''),
    // A link to anything but a character (a place, an item) takes the World Creator's color.
    renderHTML: ({ options, node }) => {
      const kind = getItems().find((i) => i.id === node.attrs.id)?.kind;
      const world = kind !== undefined && kind !== 'Character';
      return [
        'span',
        world ? { ...options.HTMLAttributes, class: 'mention is-world' } : options.HTMLAttributes,
        String(node.attrs.label ?? ''),
      ];
    },
    suggestion: {
      items: ({ query }) => matchItems(getItems(), query),
      render: suggestionPopup(popup),
    },
  });
}
