import { Link } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import type { Entry } from '../../data/types';
import { useBody, useEntries, useEntry } from '../../lib/entries/hooks';
import { ProseView } from './ProseView';
import { EntryGate } from './WorldFrame';
import {
  childrenOf,
  columnsOf,
  displayValue,
  notebookDescription,
  propsOf,
  type WorldColumn,
} from './worldModel';

/** A whole notebook as one document, to print or save as a PDF. */
export function NotebookPrintPage({ notebookId }: { notebookId: string }) {
  const notebook = useEntry(notebookId);
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/world/$notebookId"
          params={{ notebookId }}
          className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-accent"
        >
          <Icon name="arrowLeft" size={16} />
          Back to the notebook
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
      <p className="no-print text-[0.85rem] text-muted">
        To save a PDF, pick “Save as PDF” as the printer.
      </p>
      <EntryGate live={notebook} noun="notebook">
        {(n) => <NotebookDocument notebook={n} />}
      </EntryGate>
    </div>
  );
}

function NotebookDocument({ notebook }: { notebook: Entry }) {
  const entries = useEntries();
  // Indexes with nothing in them are left out of the printout.
  const indexes = childrenOf(entries.data, notebook.id, 'index').filter(
    (i) => childrenOf(entries.data, i.id, 'page').length > 0,
  );
  return (
    <article className="print-doc panel flex flex-col gap-6">
      <header>
        <h1 className="text-[2rem]">{notebook.title || 'Untitled notebook'}</h1>
        {notebookDescription(notebook) && (
          <p className="text-muted">{notebookDescription(notebook)}</p>
        )}
      </header>
      {indexes.length === 0 && <EmptyState>This notebook is empty.</EmptyState>}
      {indexes.map((index) => (
        <section key={index.id} className="flex flex-col gap-4">
          <h2 className="border-b-2 border-accent pb-1 text-[1.5rem]">
            {index.title || 'Untitled index'}
          </h2>
          {childrenOf(entries.data, index.id, 'page').map((p) => (
            <PrintedPage
              key={p.id}
              page={p}
              entries={entries.data}
              columns={columnsOf(index)}
              depth={0}
            />
          ))}
        </section>
      ))}
    </article>
  );
}

function PrintedPage({
  page,
  entries,
  columns,
  depth,
}: {
  page: Entry;
  entries: Entry[] | undefined;
  columns: WorldColumn[];
  depth: number;
}) {
  const body = useBody(page.id);
  const props = propsOf(page);
  const values = columns
    .map((c) => [c.id, c.name, displayValue(c, props[c.id])] as const)
    .filter(([, , v]) => v);
  return (
    <section className={`print-page flex flex-col gap-2 ${depth ? 'ml-4' : ''}`}>
      <h3 className={depth ? 'text-[1.05rem]' : 'text-[1.2rem]'}>
        {page.title.trim() || 'Untitled'}
      </h3>
      {values.length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-[0.9rem]">
          {values.map(([id, name, v]) => (
            <div key={id} className="contents">
              <dt className="text-muted">{name}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {body.data?.doc && <ProseView doc={body.data.doc} />}
      {childrenOf(entries, page.id, 'page').map((p) => (
        <PrintedPage key={p.id} page={p} entries={entries} columns={[]} depth={depth + 1} />
      ))}
    </section>
  );
}
