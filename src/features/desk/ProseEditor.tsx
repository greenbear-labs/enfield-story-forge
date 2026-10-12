import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { countWords, mentionIds } from '../../lib/entries/prose';
import { useDebouncedSave } from '../../lib/entries/useDebouncedSave';
import type { MentionItem } from './MentionList';
import { hintedNames, linkAllNames, nameHints, nameHintsKey } from './nameHints';
import { proseMention } from './proseMention';

export interface ProseSave {
  doc: Record<string, unknown>;
  words: number;
  /** Ids of the entries @mentioned in the prose. */
  mentions: string[];
}

/**
 * The prose editor: plain paragraphs, bold, italic, quotes, scene breaks, and
 * @mentions of the people in `mentionables`.
 * It saves a moment after you stop typing, and on the way out. Live updates
 * don't reset it, so keep one editor per scene (key it by the scene's id).
 */
export default function ProseEditor({
  initial,
  onSave,
  onWords,
  label,
  mentionables,
}: {
  initial: Record<string, unknown> | null;
  onSave: (save: ProseSave) => void;
  onWords: (words: number) => void;
  label: string;
  mentionables: MentionItem[];
}) {
  const { schedule, flush } = useDebouncedSave(onSave, 800);
  // The editor is built once, so it reads the latest cast through a ref.
  const people = useRef(mentionables);
  useEffect(() => {
    people.current = mentionables;
  });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        link: false,
        underline: false,
        strike: false,
      }),
      Placeholder.configure({ placeholder: 'Start writing… (type @ to mention someone)' }),
      // The getters run on keystrokes, never during render.
      // eslint-disable-next-line react-hooks/refs
      proseMention(() => people.current),
      // eslint-disable-next-line react-hooks/refs
      nameHints(() => people.current),
    ],
    content: initial ?? '',
    editorProps: {
      attributes: {
        class: 'prose-page',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        spellcheck: 'true',
      },
    },
    onCreate: ({ editor }) => onWords(countWords(editor.getText({ blockSeparator: '\n\n' }))),
    onUpdate: ({ editor }) => {
      const words = countWords(editor.getText({ blockSeparator: '\n\n' }));
      onWords(words);
      const doc = editor.getJSON() as Record<string, unknown>;
      schedule({ doc, words, mentions: mentionIds(doc) });
    },
    onBlur: flush,
  });

  // When the cast changes (or first loads), look for names again.
  useEffect(() => {
    if (editor && !editor.isDestroyed)
      editor.view.dispatch(editor.state.tr.setMeta(nameHintsKey, true));
  }, [editor, mentionables]);

  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      quote: e?.isActive('blockquote') ?? false,
      unlinked: hintedNames(e).join('\u0000'),
    }),
  });
  const unlinked = marks?.unlinked ? marks.unlinked.split('\u0000') : [];

  return (
    <div className="flex flex-col gap-2">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="seg font-bold"
          aria-pressed={marks?.bold}
          title="Bold (Ctrl+B)"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className="seg italic"
          aria-pressed={marks?.italic}
          title="Italic (Ctrl+I)"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className="seg"
          aria-pressed={marks?.quote}
          title="Quote (a letter, a sign, a memory)"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button
          type="button"
          className="seg"
          title="A break inside the scene: a jump in time or place"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          * * * Break
        </button>
      </div>
      <EditorContent editor={editor} />
      {unlinked.length > 0 && (
        <p
          data-sec="char"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.82rem] text-muted"
        >
          <span>Named without a link: {unlinked.join(', ')}.</span>
          <button
            type="button"
            className="font-semibold text-accent hover:underline"
            onClick={() => editor && linkAllNames(editor, mentionables)}
          >
            Link {unlinked.length === 1 ? 'it' : 'them'}
          </button>
        </p>
      )}
    </div>
  );
}
