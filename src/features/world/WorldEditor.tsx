import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { mentionIds } from '../../lib/entries/prose';
import { useDebouncedSave } from '../../lib/entries/useDebouncedSave';
import type { MentionItem } from '../desk/MentionList';
import { proseMention } from '../desk/proseMention';
import { SlashCommands } from './slashCommands';

export interface WorldSave {
  doc: Record<string, unknown>;
  /** Ids of the entries @linked in the text. */
  mentions: string[];
}

const TOOLS = [
  { key: 'h2', label: 'Heading', title: 'A heading' },
  { key: 'h3', label: 'Subheading', title: 'A smaller heading' },
  { key: 'bold', label: 'Bold', title: 'Bold (Ctrl+B)' },
  { key: 'italic', label: 'Italic', title: 'Italic (Ctrl+I)' },
  { key: 'bullets', label: '• List', title: 'A bulleted list' },
  { key: 'numbers', label: '1. List', title: 'A numbered list' },
  { key: 'quote', label: 'Quote', title: 'A quote or a saying' },
] as const;

/**
 * A world page's rich text: headings, lists, quotes, bold and italic, "/"
 * for blocks, and "@" to link another page or a character (a click on a link
 * opens it). It saves a moment after you stop typing, and on the way out.
 * Live updates don't reset it, so keep one editor per page (key it by the page's id).
 */
export default function WorldEditor({
  initial,
  onSave,
  label,
  linkables,
  onOpen,
}: {
  initial: Record<string, unknown> | null;
  onSave: (save: WorldSave) => void;
  label: string;
  linkables: MentionItem[];
  onOpen: (entryId: string) => void;
}) {
  const { schedule, flush } = useDebouncedSave(onSave, 800);
  // The editor is built once, so it reads the latest list and handler through refs.
  const latest = useRef({ linkables, onOpen });
  useEffect(() => {
    latest.current = { linkables, onOpen };
  });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: false,
      }),
      Placeholder.configure({
        placeholder: 'Write about it… (type / for headings and lists, @ to link a page)',
      }),
      SlashCommands,
      // The getter runs on keystrokes, never during render.
      // eslint-disable-next-line react-hooks/refs
      proseMention(() => latest.current.linkables, {
        sec: 'world',
        label: 'Link',
        empty: (q) => (q ? `No page or character called “${q}”.` : 'Nothing to link yet.'),
      }),
    ],
    content: initial ?? '',
    editorProps: {
      attributes: {
        class: 'rich-page',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        spellcheck: 'true',
      },
      handleClickOn: (_view, _pos, node) => {
        if (node.type.name !== 'mention') return false;
        latest.current.onOpen(String(node.attrs.id));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON() as Record<string, unknown>;
      schedule({ doc, mentions: mentionIds(doc) });
    },
    onBlur: flush,
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e?.isActive('heading', { level: 2 }) ?? false,
      h3: e?.isActive('heading', { level: 3 }) ?? false,
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      bullets: e?.isActive('bulletList') ?? false,
      numbers: e?.isActive('orderedList') ?? false,
      quote: e?.isActive('blockquote') ?? false,
    }),
  });

  const run = (key: (typeof TOOLS)[number]['key']) => {
    const chain = editor?.chain().focus();
    if (!chain) return;
    if (key === 'h2') chain.toggleHeading({ level: 2 }).run();
    else if (key === 'h3') chain.toggleHeading({ level: 3 }).run();
    else if (key === 'bold') chain.toggleBold().run();
    else if (key === 'italic') chain.toggleItalic().run();
    else if (key === 'bullets') chain.toggleBulletList().run();
    else if (key === 'numbers') chain.toggleOrderedList().run();
    else chain.toggleBlockquote().run();
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="seg"
            aria-pressed={active?.[t.key] ?? false}
            title={t.title}
            onClick={() => run(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
