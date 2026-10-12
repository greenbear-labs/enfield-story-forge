import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { MentionList, type MentionItem, type MentionListHandle } from './MentionList';

type Props = SuggestionProps<MentionItem, { id: string; label: string }>;

/** Places the popup under the "@", inside the window. */
function place(el: HTMLElement, props: Props) {
  const rect = props.clientRect?.();
  if (!rect) return;
  const width = 240;
  el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  el.style.top = `${rect.bottom + 6}px`;
}

/**
 * @mentions in the prose: type "@" and pick someone from your cast. A mention
 * reads as the plain name in the text, the export, and the word count.
 * `getItems` is read on every keystroke, so the list stays current.
 */
export function proseMention(getItems: () => MentionItem[]) {
  return Mention.configure({
    HTMLAttributes: { class: 'mention' },
    renderText: ({ node }) => String(node.attrs.label ?? ''),
    renderHTML: ({ options, node }) => [
      'span',
      options.HTMLAttributes,
      String(node.attrs.label ?? ''),
    ],
    suggestion: {
      items: ({ query }) => {
        const q = query.trim().toLowerCase();
        const all = getItems();
        const starts = all.filter((i) => i.label.toLowerCase().startsWith(q));
        const contains = all.filter(
          (i) => !i.label.toLowerCase().startsWith(q) && i.label.toLowerCase().includes(q),
        );
        return [...starts, ...contains].slice(0, 6);
      },
      render: () => {
        let renderer: ReactRenderer<MentionListHandle> | null = null;
        let box: HTMLDivElement | null = null;
        return {
          onStart: (props: Props) => {
            box = document.createElement('div');
            box.style.position = 'fixed';
            box.style.zIndex = '60';
            document.body.appendChild(box);
            renderer = new ReactRenderer(MentionList, { props, editor: props.editor });
            box.appendChild(renderer.element);
            place(box, props);
          },
          onUpdate: (props: Props) => {
            renderer?.updateProps(props);
            if (box) place(box, props);
          },
          onKeyDown: ({ event }: SuggestionKeyDownProps) => {
            if (event.key === 'Escape') {
              box?.remove();
              return true;
            }
            return renderer?.ref?.onKeyDown(event) ?? false;
          },
          onExit: () => {
            renderer?.destroy();
            box?.remove();
            renderer = null;
            box = null;
          },
        };
      },
    },
  });
}
