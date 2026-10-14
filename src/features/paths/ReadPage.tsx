import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { usePublishedPassages, usePublishedStory } from '../../lib/entries/publish';
import { useAuthStore } from '../auth/authStore';
import { Player, Prose } from './Player';
import {
  readerPlayId,
  storyFields,
  type PublishedPassage,
  type PublishedStory,
} from './publishModel';

/** A reader plays a published story. */
export function ReadPage({ storyId }: { storyId: string }) {
  const story = usePublishedStory(storyId);
  if (story.error || story.data === null)
    return (
      <>
        <BackLink />
        <EmptyState>
          This story can’t be found. Its writer may have stopped sharing it, or the link is
          incomplete.
        </EmptyState>
      </>
    );
  if (!story.data) return <Loading />;
  return <Reader key={storyId} story={story.data} />;
}

function BackLink() {
  return (
    <Link to="/paths/library" className="text-muted hover:text-accent">
      ← The library
    </Link>
  );
}

function Reader({ story }: { story: PublishedStory }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const passages = usePublishedPassages(story.id);
  const playable = useMemo(
    () =>
      passages.data && {
        playId: readerPlayId(story.id),
        title: story.title,
        blurb: story.blurb,
        fields: storyFields(story),
        passages: passages.data,
      },
    [story, passages.data],
  );
  if (passages.error)
    return <EmptyState>Couldn’t load the story. Check your connection and reload.</EmptyState>;
  if (!playable) return <Loading />;
  const byId = new Map(passages.data!.map((p) => [p.id, p]));
  const passage = (id: string) => byId.get(id) as PublishedPassage;

  return (
    <Player
      story={playable}
      draft={null}
      cover={<img src={story.coverUrl ?? '/paths-art/lantern-path.webp'} alt="" />}
      from={null}
      onFromHandled={() => {}}
      renderBody={(p) => <Prose doc={passage(p.id).doc} />}
      renderArt={(p) => {
        const url = passage(p.id).imageUrl;
        return url ? <img src={url} alt="" className="sp-page-art" /> : null;
      }}
      nav={() => (
        <span className="flex flex-wrap items-center gap-x-3">
          <BackLink />
          {story.ownerName && <span className="text-muted">by {story.ownerName}</span>}
          {story.ownerId === uid && (
            <Link
              to="/paths/$adventureId"
              params={{ adventureId: story.id }}
              className="text-muted hover:text-accent"
            >
              Edit
            </Link>
          )}
        </span>
      )}
    />
  );
}
