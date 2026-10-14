import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import { reviewStory, setFeatured, useLibrary, useReviewQueue } from '../../lib/entries/publish';
import { useAdminCheck } from '../feedback/feedback';
import { featuredOf, moveFeatured, newestFirst, type PublishedStory } from './publishModel';
import { SampleShelf } from './SampleShelf';
import { usePathsTitle } from './usePathsTitle';

/**
 * The admin's desk for the library: stories waiting for review (approve, or
 * send back with a note), the featured stories in order, and the rest of the
 * library.
 */
export function ReviewPage() {
  const admin = useAdminCheck();
  usePathsTitle('Review');
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[0.85rem]">
        <Link to="/paths/library" className="text-muted hover:text-accent">
          ← The library
        </Link>
      </nav>
      <h1 className="paths-glow text-[2.2rem] leading-tight max-sm:text-[1.8rem]">
        Library review
      </h1>
      {admin === undefined ? (
        <Loading />
      ) : admin ? (
        <ReviewDesk />
      ) : (
        <EmptyState>Only the Shadow Paths admin reviews stories for the library.</EmptyState>
      )}
    </>
  );
}

function ReviewDesk() {
  const queue = useReviewQueue(true);
  const library = useLibrary();
  const stories = library.data ?? [];
  const featured = featuredOf(stories);
  const rest = stories.filter((s) => s.featured === null).sort(newestFirst);
  const waiting = [...(queue.data ?? [])].sort(newestFirst).reverse();

  return (
    <>
      <section className="flex flex-col gap-2.5" aria-label="Waiting for review">
        <h2 className="text-[1.3rem]">
          Waiting for review{waiting.length > 0 && ` (${waiting.length})`}
        </h2>
        {queue.error ? (
          <EmptyState>
            Couldn’t load the stories waiting. Check your connection and reload.
          </EmptyState>
        ) : queue.data === undefined ? (
          <Loading />
        ) : waiting.length === 0 ? (
          <EmptyState>Nothing is waiting. New submissions will show up here.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {waiting.map((s) => (
              <li key={s.id}>
                <StoryRow story={s}>
                  <ReviewActions story={s} />
                </StoryRow>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5" aria-label="Featured">
        <h2 className="text-[1.3rem]">Featured</h2>
        <p className="text-[0.88rem] text-muted">
          Featured stories sit at the top of the library, in this order.
        </p>
        {library.data === undefined ? (
          <Loading />
        ) : featured.length === 0 ? (
          <EmptyState>None yet. Feature a story from the library below.</EmptyState>
        ) : (
          <ol className="flex flex-col gap-2">
            {featured.map((s, i) => (
              <li key={s.id}>
                <StoryRow story={s} compact>
                  <span className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      aria-label={`Move ${s.title} up`}
                      disabled={i === 0}
                      onClick={() => setFeatured(moveFeatured(featured, s.id, -1)!)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      aria-label={`Move ${s.title} down`}
                      disabled={i === featured.length - 1}
                      onClick={() => setFeatured(moveFeatured(featured, s.id, 1)!)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() =>
                        setFeatured(
                          featured.filter((f) => f.id !== s.id).map((f) => f.id),
                          [s.id],
                        )
                      }
                    >
                      Stop featuring
                    </button>
                  </span>
                </StoryRow>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-2.5" aria-label="In the library">
        <h2 className="text-[1.3rem]">In the library</h2>
        {library.error ? (
          <EmptyState>Couldn’t open the library. Check your connection and reload.</EmptyState>
        ) : library.data === undefined ? (
          <Loading />
        ) : rest.length === 0 ? (
          <EmptyState>
            {featured.length ? 'Every story in the library is featured.' : 'The library is empty.'}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {rest.map((s) => (
              <li key={s.id}>
                <StoryRow story={s} compact>
                  <span className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => setFeatured([...featured.map((f) => f.id), s.id])}
                    >
                      Feature
                    </button>
                    <TakeOut story={s} />
                  </span>
                </StoryRow>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SampleShelf admin />
    </>
  );
}

/** A story as the admin sees it: cover, title, writer, blurb, size, and a way to read it. */
function StoryRow({
  story,
  compact,
  children,
}: {
  story: PublishedStory;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="panel flex flex-wrap items-start gap-3">
      <img
        src={story.coverUrl ?? '/paths-art/lantern-path-small.webp'}
        alt=""
        className={`flex-none rounded-md object-cover ${compact ? 'h-[56px] w-[84px]' : 'h-[84px] w-[126px]'}`}
      />
      <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-1">
        <b className="font-display text-[1.1rem]">{story.title}</b>
        <span className="text-[0.82rem] text-muted">
          by {story.ownerName || 'a writer'} · {story.passageCount}{' '}
          {story.passageCount === 1 ? 'passage' : 'passages'} · {story.endingCount}{' '}
          {story.endingCount === 1 ? 'ending' : 'endings'}
        </span>
        {!compact && story.blurb && <p className="text-[0.9rem]">{story.blurb}</p>}
        {!compact && story.categories.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {story.categories.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </span>
        )}
        <Link
          to="/paths/read/$storyId"
          params={{ storyId: story.id }}
          className="self-start text-[0.85rem] text-accent underline"
        >
          Read it
        </Link>
      </div>
      {children}
    </article>
  );
}

function ReviewActions({ story }: { story: PublishedStory }) {
  const [note, setNote] = useState<string | null>(null);
  if (note !== null)
    return (
      <NoteForm
        note={note}
        onNote={setNote}
        label="Send back"
        placeholder="What to change before it goes in the library"
        onCancel={() => setNote(null)}
        onSend={() => {
          reviewStory(story.id, { note });
          toast(`Sent back “${story.title}” with your note.`);
        }}
      />
    );
  return (
    <span className="flex flex-wrap gap-1.5">
      <button
        type="button"
        className="btn btn-primary btn-small"
        onClick={() => {
          reviewStory(story.id, { approve: true });
          toast(`“${story.title}” is in the library.`);
        }}
      >
        <Icon name="check" size={16} /> Approve
      </button>
      <button type="button" className="btn btn-small" onClick={() => setNote('')}>
        Send back
      </button>
    </span>
  );
}

function TakeOut({ story }: { story: PublishedStory }) {
  const [note, setNote] = useState<string | null>(null);
  if (note !== null)
    return (
      <NoteForm
        note={note}
        onNote={setNote}
        label="Take it out"
        placeholder="Why it’s leaving the library (the writer sees this)"
        onCancel={() => setNote(null)}
        onSend={() => {
          reviewStory(story.id, { note });
          toast(`“${story.title}” is out of the library. Its link still works.`);
        }}
      />
    );
  return (
    <button type="button" className="btn btn-ghost btn-small" onClick={() => setNote('')}>
      Take out of the library
    </button>
  );
}

function NoteForm({
  note,
  onNote,
  label,
  placeholder,
  onCancel,
  onSend,
}: {
  note: string;
  onNote: (note: string) => void;
  label: string;
  placeholder: string;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (note.trim()) onSend();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="label">A note for the writer</span>
        <textarea
          className="txt"
          rows={3}
          maxLength={2000}
          autoFocus
          placeholder={placeholder}
          value={note}
          onChange={(e) => onNote(e.target.value)}
        />
      </label>
      <span className="flex flex-wrap gap-1.5">
        <button type="submit" className="btn btn-primary btn-small" disabled={!note.trim()}>
          {label}
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onCancel}>
          Cancel
        </button>
      </span>
    </form>
  );
}
