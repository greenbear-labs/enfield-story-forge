import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { MentionList, type MentionItem, type MentionListHandle } from './MentionList';

type Props = SuggestionProps<MentionItem, { id: string; label: string }>;
type Extra = Pick<Parameters<typeof MentionList>[0], 'sec' | 'label' | 'empty'>;

/** Places the popup under the trigger character, inside the window. */
function place(el: HTMLElement, props: Props) {
  const rect = props.clientRect?.();
  if (!rect) return;
  const width = 240;
  el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  el.style.top = `${rect.bottom + 6}px`;
}

/** The popup list for a TipTap suggestion (@mentions, / commands), as a `render` option. */
export function suggestionPopup(extra: Extra = {}) {
  return () => {
    let renderer: ReactRenderer<MentionListHandle> | null = null;
    let box: HTMLDivElement | null = null;
    return {
      onStart: (props: Props) => {
        box = document.createElement('div');
        box.style.position = 'fixed';
        box.style.zIndex = '60';
        document.body.appendChild(box);
        renderer = new ReactRenderer(MentionList, {
          props: { ...props, ...extra },
          editor: props.editor,
        });
        box.appendChild(renderer.element);
        place(box, props);
      },
      onUpdate: (props: Props) => {
        renderer?.updateProps({ ...props, ...extra });
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
  };
}

/** Items whose label starts with the query come first, then the ones that contain it. */
export function matchItems(all: MentionItem[], query: string, max = 6): MentionItem[] {
  const q = query.trim().toLowerCase();
  const starts = all.filter((i) => i.label.toLowerCase().startsWith(q));
  const contains = all.filter(
    (i) => !i.label.toLowerCase().startsWith(q) && i.label.toLowerCase().includes(q),
  );
  return [...starts, ...contains].slice(0, max);
}
