import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useDebouncedSave } from '../../lib/entries/useDebouncedSave';

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
 * A world page's rich text: headings, lists, quotes, bold and italic. It
 * saves a moment after you stop typing, and on the way out. Live updates
 * don't reset it, so keep one editor per page (key it by the page's id).
 */
export default function WorldEditor({
  initial,
  onSave,
  label,
}: {
  initial: Record<string, unknown> | null;
  onSave: (doc: Record<string, unknown>) => void;
  label: string;
}) {
  const { schedule, flush } = useDebouncedSave(onSave, 800);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: 'Write about it: history, look, rumors, anything…' }),
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
    },
    onUpdate: ({ editor }) => schedule(editor.getJSON() as Record<string, unknown>),
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
