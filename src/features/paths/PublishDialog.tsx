import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Loading } from '../../components/ui/Loading';
import { toast } from '../../components/ui/toast';
import type { Entry } from '../../data/types';
import { publishStory, setStoryStatus, usePublishedStory } from '../../lib/entries/publish';
import { useAuthStore } from '../auth/authStore';
import { useIsFeedbackAdmin } from '../feedback/feedback';
import { storyHealth } from './healthModel';
import { startIdOf } from './pathsModel';
import {
  isShared,
  readLink,
  statusLabel,
  type PublishedStory,
  type PublishStatus,
} from './publishModel';

const when = (ms: number | null) =>
  ms === null
    ? 'just now'
    : new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Publish an adventure: share it with a link, or submit it to the library.
 * Readers play a copy, so changes reach them only when the copy is updated.
 */
export function PublishDialog({
  adventure,
  passages,
  onClose,
}: {
  adventure: Entry;
  passages: Entry[];
  onClose: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const live = usePublishedStory(adventure.id);
  const admin = useIsFeedbackAdmin();
  const [busy, setBusy] = useState<PublishStatus | null>(null);
  const issues = storyHealth(adventure, passages).issues.length;
  const canPublish = !!startIdOf(adventure) && passages.length > 0;

  const publish = (status: PublishStatus) => {
    setBusy(status);
    publishStory(ws, adventure, passages, status).then(
      () => {
        setBusy(null);
        toast(
          status === 'unlisted'
            ? 'Published. Anyone with the link can play it.'
            : status === 'submitted'
              ? 'Submitted to the library. It can be shared with a link meanwhile.'
              : 'Published in the library.',
        );
      },
      (err: unknown) => {
        console.error('Could not publish the story', err);
        setBusy(null);
        toast('Couldn’t publish the story. Check your connection and try again.');
      },
    );
  };

  return (
    <Dialog title="Publish" onClose={onClose} sec="paths">
      {live.data === undefined && !live.error ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-4 text-[0.92rem]">
          {live.data?.reviewNote && <ReviewNote note={live.data.reviewNote} />}
          {live.data && isShared(live.data.status) && <Published story={live.data} />}
          {!canPublish ? (
            <p className="text-muted">
              Write a first passage and choose “Start the story here” before publishing.
            </p>
          ) : (
            <>
              {issues > 0 && (
                <p className="rounded-md border border-line bg-sunken px-3 py-2">
                  Story health has {issues === 1 ? '1 thing' : `${issues} things`} to check. Readers
                  can still play, but they may get stuck.
                </p>
              )}
              <Actions story={live.data ?? null} admin={admin} busy={busy} onPublish={publish} />
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** The admin's note on a story sent back from the library review. */
export function ReviewNote({ note }: { note: string }) {
  return (
    <aside
      aria-label="Note from the library review"
      className="rounded-md border border-accent/50 bg-accent-soft px-3 py-2 text-[0.9rem]"
    >
      <b className="block">Sent back from the library review</b>
      <span className="whitespace-pre-line">{note}</span>
      <span className="mt-1 block text-[0.82rem] text-muted">
        Make the changes, then use Publish to submit it to the library again.
      </span>
    </aside>
  );
}

/** Where the published copy stands, and its link. */
function Published({ story }: { story: PublishedStory }) {
  const link = readLink(story.id);
  const copy = () =>
    navigator.clipboard.writeText(link).then(
      () => toast('Link copied.'),
      () => toast('Couldn’t copy the link. Select it and copy it instead.'),
    );
  return (
    <section className="flex flex-col gap-2" aria-label="Published copy">
      <p>
        <b>{statusLabel(story.status)}.</b>{' '}
        <span className="text-muted">Copy last updated {when(story.updatedAt)}.</span>
      </p>
      <div className="flex min-w-0 gap-2">
        <input
          className="txt min-w-0 flex-1 py-1"
          readOnly
          value={link}
          aria-label="Link to the story"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="btn btn-small" onClick={copy}>
          Copy link
        </button>
      </div>
      <Link
        to="/paths/read/$storyId"
        params={{ storyId: story.id }}
        className="self-start text-accent underline"
      >
        Open it as a reader
      </Link>
    </section>
  );
}

function Actions({
  story,
  admin,
  busy,
  onPublish,
}: {
  story: PublishedStory | null;
  admin: boolean;
  busy: PublishStatus | null;
  onPublish: (status: PublishStatus) => void;
}) {
  const button = (status: PublishStatus, label: string, primary = false) => (
    <button
      type="button"
      className={primary ? 'btn btn-primary self-start' : 'btn self-start'}
      disabled={busy !== null}
      onClick={() => onPublish(status)}
    >
      {busy === status ? 'Publishing…' : label}
    </button>
  );
  const library = admin
    ? button('public', 'Publish in the library')
    : button('submitted', 'Submit to the library');

  if (!story || !isShared(story.status))
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted">
          Readers play a copy of the story as it is now. Keep writing here; they see your changes
          when you update the copy.
        </p>
        <div className="flex flex-col gap-1">
          {button('unlisted', 'Share with a link', true)}
          <span className="text-[0.85rem] text-muted">
            Anyone signed in with the link can play it.
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {library}
          <span className="text-[0.85rem] text-muted">
            {admin
              ? 'It goes straight into the library for everyone to find.'
              : 'Once it’s reviewed, it’s in the library for everyone to find. The link works meanwhile.'}
          </span>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {button(story.status, 'Update the published copy', true)}
      {story.status === 'unlisted' && library}
      {story.status === 'submitted' && admin && button('public', 'Publish in the library')}
      <button
        type="button"
        className="btn btn-ghost btn-small self-start"
        disabled={busy !== null}
        onClick={() => {
          const before = story.status;
          setStoryStatus(story.id, 'private');
          toast('The story isn’t shared anymore.', {
            action:
              before === 'public' && !admin
                ? undefined
                : { label: 'Undo', onClick: () => setStoryStatus(story.id, before) },
          });
        }}
      >
        Stop sharing
      </button>
      {story.status === 'public' && !admin && (
        <span className="text-[0.85rem] text-muted">
          Stopping takes it out of the library. To bring it back, submit it again.
        </span>
      )}
    </div>
  );
}
