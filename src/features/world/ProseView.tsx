import type { ReactNode } from 'react';
import type { ProseNode } from '../../lib/entries/prose';

const isNode = (v: unknown): v is ProseNode =>
  !!v && typeof v === 'object' && typeof (v as ProseNode).type === 'string';

function inline(node: ProseNode, key: number): ReactNode {
  if (node.type === 'text') {
    let out: ReactNode = node.text ?? '';
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    if (marks.has('italic')) out = <em>{out}</em>;
    if (marks.has('bold')) out = <strong>{out}</strong>;
    return <span key={key}>{out}</span>;
  }
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'mention')
    return (
      <span key={key} className="mention">
        {String(node.attrs?.label ?? '')}
      </span>
    );
  return null;
}

const kids = (node: ProseNode) => (node.content ?? []).filter(isNode);

function block(node: ProseNode, key: number): ReactNode {
  const inner = () => kids(node).map(inline);
  const nested = () => kids(node).map(block);
  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{inner()}</p>;
    case 'heading':
      return node.attrs?.level === 3 ? <h3 key={key}>{inner()}</h3> : <h2 key={key}>{inner()}</h2>;
    case 'bulletList':
      return <ul key={key}>{nested()}</ul>;
    case 'orderedList':
      return <ol key={key}>{nested()}</ol>;
    case 'listItem':
      return <li key={key}>{nested()}</li>;
    case 'blockquote':
      return <blockquote key={key}>{nested()}</blockquote>;
    case 'horizontalRule':
      return <hr key={key} />;
    default:
      return null;
  }
}

/** Rich text (TipTap JSON) shown read-only, without loading the editor. */
export function ProseView({ doc }: { doc: unknown }) {
  return <div className="rich-page !min-h-0">{isNode(doc) ? kids(doc).map(block) : null}</div>;
}
