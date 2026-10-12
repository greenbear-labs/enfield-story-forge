import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { updateEntry } from '../../lib/entries/entries';
import { downloadFile } from '../../lib/entries/exportData';
import { useBodies, useEntries, useEntry } from '../../lib/entries/hooks';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { ProseView } from '../world/ProseView';
import {
  CHAPTER_STYLES,
  compile,
  compiledMarkdown,
  compileSettings,
  manuscriptFileName,
  MATTER_FIELDS,
  paragraphs,
  SCENE_BREAKS,
  sceneBreakText,
  type Compiled,
  type CompileSettings,
} from './compile';
import { childrenOf } from './deskModel';

/** Put a manuscript together: title page, front and back matter, chapters; then export it. */
export function CompilePage({ bookId }: { bookId: string }) {
  const book = useEntry(bookId);
  return (
    <div data-sec="desk" className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
      <Link
        to="/desk/$bookId"
        params={{ bookId }}
        className="no-print inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent"
      >
        <Icon name="arrowLeft" size={16} />
        Back to the manuscript
      </Link>
      {book.data === undefined ? (
        book.error ? (
          <EmptyState>Couldn’t load this manuscript. Check your connection and reload.</EmptyState>
        ) : (
          <Loading />
        )
      ) : !book.data || book.data.deletedAt ? (
        <EmptyState>This manuscript isn’t here. Its outline may be in the trash.</EmptyState>
      ) : (
        <Compiler book={book.data} />
      )}
    </div>
  );
}

function Compiler({ book }: { book: Entry }) {
  const allChapters = useEntries('chapter');
  const allScenes = useEntries('scene');
  const bodies = useBodies();
  const settings = compileSettings(book);
  const chapters = useMemo(
    () => childrenOf(allChapters.data, book.id),
    [allChapters.data, book.id],
  );
  const compiled = useMemo(
    () =>
      bodies.data
        ? compile(book, chapters, (id) => childrenOf(allScenes.data, id), bodies.data)
        : null,
    [book, chapters, allScenes.data, bodies.data],
  );

  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-5 max-[900px]:grid-cols-1">
      <aside className="no-print flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <span className="label">Compile</span>
          <h1 className="text-[1.5rem]">{book.title || 'Untitled story'}</h1>
          <p className="text-[0.88rem] text-muted">
            Put the book together as one manuscript, then download it or save it as a PDF.
          </p>
        </header>
        <Exports compiled={compiled} />
        <TitlePage book={book} settings={settings} />
        <Look book={book} settings={settings} />
        <Chapters book={book} chapters={chapters} settings={settings} />
        <Matter book={book} settings={settings} where="front" title="Front matter" />
        <Matter book={book} settings={settings} where="back" title="Back matter" />
      </aside>
      {compiled ? (
        <ManuscriptView compiled={compiled} />
      ) : bodies.error ? (
        <EmptyState>Couldn’t load the writing. Check your connection and reload.</EmptyState>
      ) : (
        <Loading />
      )}
    </div>
  );
}

function Exports({ compiled }: { compiled: Compiled | null }) {
  return (
    <section className="panel flex flex-col gap-2.5">
      <h2 className="text-[1.05rem]">Export</h2>
      {compiled && (
        <p className="text-[0.85rem] text-muted">
          {compiled.chapters.length} {compiled.chapters.length === 1 ? 'chapter' : 'chapters'} ·{' '}
          {compiled.words.toLocaleString()} words
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!compiled}
          onClick={() => window.print()}
        >
          Print or save as PDF
        </button>
        <button
          type="button"
          className="btn"
          disabled={!compiled}
          onClick={() =>
            compiled &&
            downloadFile(
              manuscriptFileName(compiled, 'md'),
              compiledMarkdown(compiled),
              'text/markdown',
            )
          }
        >
          Markdown
        </button>
      </div>
      <p className="text-[0.8rem] text-muted">
        For a PDF, pick “Save as PDF” as the printer. Each chapter starts on a new page.
      </p>
    </section>
  );
}

function useCompileField(book: Entry, key: keyof CompileSettings, value: string) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  return useAutosaved(value, (v) => updateEntry(ws, book.id, {}, { [`compile.${key}`]: v }));
}

function TextSetting({
  book,
  name,
  label,
  value,
  placeholder,
  long = false,
}: {
  book: Entry;
  name: keyof CompileSettings;
  label: string;
  value: string;
  placeholder?: string;
  long?: boolean;
}) {
  const field = useCompileField(book, name, value);
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {long ? (
        <textarea
          className="txt field-sizing-content min-h-16"
          placeholder={placeholder}
          {...field.props}
        />
      ) : (
        <input className="txt" placeholder={placeholder} {...field.props} />
      )}
    </label>
  );
}

function TitlePage({ book, settings }: { book: Entry; settings: CompileSettings }) {
  return (
    <section className="panel flex flex-col gap-3">
      <h2 className="text-[1.05rem]">Title page</h2>
      <p className="-mt-2 text-[0.82rem] text-muted">
        The title comes from the outline.{' '}
        <Link
          to="/outlines/$outlineId"
          params={{ outlineId: book.id }}
          className="text-accent hover:underline"
        >
          Change it there
        </Link>
      </p>
      <TextSetting
        book={book}
        name="subtitle"
        label="Subtitle"
        value={settings.subtitle}
        placeholder="Optional"
      />
      <TextSetting
        book={book}
        name="author"
        label="Author"
        value={settings.author}
        placeholder="The name on the cover"
      />
    </section>
  );
}

function Look({ book, settings }: { book: Entry; settings: CompileSettings }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const set = (key: string, value: string) =>
    updateEntry(ws, book.id, {}, { [`compile.${key}`]: value });
  return (
    <section className="panel flex flex-col gap-3">
      <h2 className="text-[1.05rem]">Chapters and scenes</h2>
      <label className="flex flex-col gap-1">
        <span className="label">Chapter headings</span>
        <select
          className="txt"
          value={settings.chapterStyle}
          onChange={(e) => set('chapterStyle', e.target.value)}
        >
          {CHAPTER_STYLES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="label">Between scenes</span>
        <div role="group" aria-label="Between scenes" className="flex flex-wrap gap-1.5">
          {SCENE_BREAKS.map((b) => (
            <button
              key={b.key}
              type="button"
              className="seg"
              aria-pressed={settings.sceneBreak === b.key}
              onClick={() => set('sceneBreak', b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chapters({
  book,
  chapters,
  settings,
}: {
  book: Entry;
  chapters: Entry[];
  settings: CompileSettings;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  // A tick shows at once; the saved settings catch up a moment later.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const skip = new Set(settings.skip);
  const included = (id: string) => ticks[id] ?? !skip.has(id);
  const toggle = (id: string, include: boolean) => {
    setTicks((t) => ({ ...t, [id]: include }));
    const others = settings.skip.filter((x) => x !== id);
    const next = include ? others : [...others, id];
    // Drop ids of chapters that no longer exist.
    const ids = new Set(chapters.map((c) => c.id));
    updateEntry(ws, book.id, {}, { 'compile.skip': next.filter((x) => ids.has(x)) });
  };
  if (chapters.length === 0) return null;
  return (
    <section className="panel flex flex-col gap-2">
      <h2 className="text-[1.05rem]">What to include</h2>
      <ul className="flex flex-col gap-1">
        {chapters.map((c, i) => (
          <li key={c.id}>
            <label className="flex items-center gap-2 text-[0.9rem]">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={included(c.id)}
                onChange={(e) => toggle(c.id, e.target.checked)}
              />
              <span className="w-6 text-right font-mono text-[0.8rem] text-muted">{i + 1}</span>
              <span className="truncate">{c.title || `Chapter ${i + 1}`}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Matter({
  book,
  settings,
  where,
  title,
}: {
  book: Entry;
  settings: CompileSettings;
  where: 'front' | 'back';
  title: string;
}) {
  return (
    <section className="panel flex flex-col gap-3">
      <h2 className="text-[1.05rem]">{title}</h2>
      {MATTER_FIELDS.filter((f) => f.where === where).map((f) => (
        <TextSetting
          key={f.key}
          book={book}
          name={f.key}
          label={f.label}
          value={settings[f.key]}
          placeholder={f.placeholder}
          long={f.key !== 'epigraphSource'}
        />
      ))}
    </section>
  );
}

/** The compiled manuscript, as it prints. */
function ManuscriptView({ compiled }: { compiled: Compiled }) {
  const s = compiled.settings;
  const brk = sceneBreakText(compiled);
  return (
    <article className="manuscript print-doc panel" aria-label="Manuscript preview">
      <section className="ms-title-page ms-page">
        <h1>{compiled.title}</h1>
        {s.subtitle.trim() && <p className="ms-subtitle">{s.subtitle.trim()}</p>}
        {s.author.trim() && <p className="ms-author">{s.author.trim()}</p>}
      </section>
      {s.dedication.trim() && (
        <section className="ms-matter ms-page ms-dedication">
          {paragraphs(s.dedication).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      )}
      {s.epigraph.trim() && (
        <section className="ms-matter ms-page ms-epigraph">
          {paragraphs(s.epigraph).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.epigraphSource.trim() && <p className="ms-source">— {s.epigraphSource.trim()}</p>}
        </section>
      )}
      {compiled.chapters.length === 0 && (
        <EmptyState>No chapters to include. Add some on the Writer’s Desk.</EmptyState>
      )}
      {compiled.chapters.map((ch) => (
        <section key={ch.id} className="ms-chapter">
          <header className="ms-chapter-head">
            <h2>{ch.heading}</h2>
            {ch.subheading && <p>{ch.subheading}</p>}
          </header>
          {ch.scenes.length === 0 && <p className="ms-empty no-print">No writing yet.</p>}
          {ch.scenes.map((doc, i) => (
            <div key={i} className="ms-scene">
              {i > 0 && (
                <p className="ms-break" aria-label="Scene break">
                  {brk || ' '}
                </p>
              )}
              <ProseView doc={doc} />
            </div>
          ))}
        </section>
      ))}
      {s.acknowledgements.trim() && (
        <section className="ms-chapter ms-back">
          <header className="ms-chapter-head">
            <h2>Acknowledgements</h2>
          </header>
          {paragraphs(s.acknowledgements).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      )}
      {s.aboutAuthor.trim() && (
        <section className="ms-chapter ms-back">
          <header className="ms-chapter-head">
            <h2>About the author</h2>
          </header>
          {paragraphs(s.aboutAuthor).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      )}
    </article>
  );
}
