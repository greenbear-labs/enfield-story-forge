import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { MentionItem } from '../desk/MentionList';
import { matchItems, suggestionPopup } from '../desk/suggestionPopup';

interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  run: (editor: Editor, range: Range) => void;
}

const start = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h2',
    label: 'Heading',
    hint: 'Big',
    run: (e, r) => start(e, r).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Subheading',
    hint: 'Small',
    run: (e, r) => start(e, r).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bullets',
    label: 'Bulleted list',
    hint: '•',
    run: (e, r) => start(e, r).toggleBulletList().run(),
  },
  {
    id: 'numbers',
    label: 'Numbered list',
    hint: '1.',
    run: (e, r) => start(e, r).toggleOrderedList().run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: '“”',
    run: (e, r) => start(e, r).toggleBlockquote().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: '—',
    run: (e, r) => start(e, r).setHorizontalRule().run(),
  },
  {
    id: 'link',
    label: 'Link to a page',
    hint: '@',
    // Starts an @mention, so its own list opens.
    run: (e, r) => start(e, r).insertContent('@').run(),
  },
  {
    id: 'text',
    label: 'Plain text',
    hint: '¶',
    run: (e, r) => start(e, r).setParagraph().run(),
  },
];

const items: MentionItem[] = SLASH_COMMANDS.map((c) => ({
  id: c.id,
  label: c.label,
  kind: c.hint,
}));

/** Type "/" for a list of blocks to add: headings, lists, a quote, a divider, a link. */
export const SlashCommands = Extension.create({
  name: 'slashCommands',
  addProseMirrorPlugins() {
    return [
      Suggestion<MentionItem, { id: string; label: string }>({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommands'),
        char: '/',
        items: ({ query }) => matchItems(items, query, items.length),
        command: ({ editor, range, props }) =>
          SLASH_COMMANDS.find((c) => c.id === props.id)?.run(editor, range),
        render: suggestionPopup({
          sec: 'world',
          label: 'Add a block',
          empty: (q) => `Nothing called “${q}”.`,
        }),
      }),
    ];
  },
});
