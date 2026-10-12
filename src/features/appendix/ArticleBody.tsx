import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

/** **bold**, *italic*, and [[Article title]] links inside one line of text. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[\[(.+?)\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${m.index}`;
    if (m[1]) out.push(<strong key={key}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={key}>{m[2]}</em>);
    else
      out.push(
        <Link key={key} to="/appendix" search={{ topic: m[3] }} className="text-accent underline">
          {m[3]}
        </Link>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Kind = 'h' | 'ul' | 'ol' | 'p';

const kindOf = (line: string): Kind =>
  line.startsWith('## ') ? 'h' : line.startsWith('- ') ? 'ul' : /^\d+\. /.test(line) ? 'ol' : 'p';

/** Groups lines into runs of the same kind. Blank lines end a run. */
function runs(body: string): { kind: Kind; lines: string[] }[] {
  const out: { kind: Kind; lines: string[] }[] = [];
  let prevBlank = true;
  for (const line of body.split('\n')) {
    if (!line.trim()) {
      prevBlank = true;
      continue;
    }
    const kind = kindOf(line);
    const last = out[out.length - 1];
    if (last && !prevBlank && last.kind === kind && kind !== 'h') last.lines.push(line);
    else out.push({ kind, lines: [line] });
    prevBlank = false;
  }
  return out;
}

/** Renders an article body (see articles.ts for the format). */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-3 leading-relaxed">
      {runs(body).map(({ kind, lines }, i) => {
        if (kind === 'h') {
          return (
            <h2 key={i} className="mt-2 text-[1.15rem]">
              {inline(lines[0]!.slice(3))}
            </h2>
          );
        }
        if (kind === 'p') return <p key={i}>{inline(lines.join(' '))}</p>;
        const items = lines.map((l, j) => <li key={j}>{inline(l.replace(/^(- |\d+\. )/, ''))}</li>);
        return kind === 'ul' ? (
          <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5">
            {items}
          </ul>
        ) : (
          <ol key={i} className="flex list-decimal flex-col gap-1.5 pl-5">
            {items}
          </ol>
        );
      })}
    </div>
  );
}
