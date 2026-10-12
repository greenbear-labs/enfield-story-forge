import { Extension, type Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { nameMatches, type NamedPerson } from './nameMatches';

export const nameHintsKey = new PluginKey<DecorationSet>('nameHints');

/** Names from the cast typed as plain text (not yet @mentions), with their places in the doc. */
function unlinkedNames(doc: ProseMirrorNode, people: NamedPerson[]) {
  const out: { from: number; to: number; person: NamedPerson }[] = [];
  if (!people.length) return out;
  doc.descendants((node, pos) => {
    if (node.isText && node.text)
      for (const m of nameMatches(node.text, people))
        out.push({ from: pos + m.start, to: pos + m.end, person: m.person });
  });
  return out;
}

/**
 * Name detection: a dotted underline under cast names typed without an @.
 * `getPeople` is read whenever the text changes; dispatch a transaction with
 * `nameHintsKey` meta to recheck after the cast changes.
 */
export function nameHints(getPeople: () => NamedPerson[]) {
  const build = (doc: ProseMirrorNode) =>
    DecorationSet.create(
      doc,
      unlinkedNames(doc, getPeople()).map((m) =>
        Decoration.inline(
          m.from,
          m.to,
          { class: 'name-hint', title: `${m.person.label} isn’t linked yet` },
          { label: m.person.label },
        ),
      ),
    );
  return Extension.create({
    name: 'nameHints',
    addProseMirrorPlugins() {
      return [
        new Plugin<DecorationSet>({
          key: nameHintsKey,
          state: {
            init: (_, state) => build(state.doc),
            apply: (tr, old) =>
              tr.docChanged || tr.getMeta(nameHintsKey)
                ? build(tr.doc)
                : old.map(tr.mapping, tr.doc),
          },
          props: {
            decorations: (state) => nameHintsKey.getState(state),
          },
        }),
      ];
    },
  });
}

/** The names the hints are pointing at, each once. */
export function hintedNames(editor: Editor | null): string[] {
  const set = editor ? nameHintsKey.getState(editor.state) : undefined;
  return [...new Set((set?.find() ?? []).map((d) => String((d.spec as { label: string }).label)))];
}

/** Turns every unlinked cast name into an @mention, in one step (one undo). */
export function linkAllNames(editor: Editor, people: NamedPerson[]): void {
  const mention = editor.schema.nodes.mention;
  const matches = unlinkedNames(editor.state.doc, people);
  if (!mention || !matches.length) return;
  const tr = editor.state.tr;
  for (const m of matches.reverse())
    tr.replaceWith(m.from, m.to, mention.create({ id: m.person.id, label: m.person.label }));
  editor.view.dispatch(tr);
  editor.view.focus();
}
