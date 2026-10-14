import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import type { Entry } from '../../data/types';
import { useBody, useEntries, useEntry } from '../../lib/entries/hooks';
import { coverOf } from '../../lib/entries/images';
import { EntryImg } from '../images/EntryImg';
import { EntryGate } from '../world/WorldFrame';
import { adventureBlurb } from './pathsModel';
import { Player, Prose, type PlayablePassage } from './Player';

/** Playtest: the author plays their own draft the way a reader will. */
export function PlayPage({ adventureId, from }: { adventureId: string; from?: string }) {
  const adventure = useEntry(adventureId);
  return (
    <EntryGate live={adventure} noun="adventure">
      {(a) => <Playtest key={a.id} adventure={a} from={from ?? null} />}
    </EntryGate>
  );
}

function Playtest({ adventure, from }: { adventure: Entry; from: string | null }) {
  const navigate = useNavigate();
  const allPassages = useEntries('passage');
  const passages = useMemo(
    () => allPassages.data?.filter((p) => p.parentId === adventure.id),
    [allPassages.data, adventure.id],
  );
  const story = useMemo(
    () =>
      passages && {
        playId: adventure.id,
        title: adventure.title,
        blurb: adventureBlurb(adventure),
        fields: adventure.fields,
        passages,
      },
    [adventure, passages],
  );
  if (allPassages.error)
    return <EmptyState>Couldn’t load the story. Check your connection and reload.</EmptyState>;
  if (!story) return <Loading />;
  const cover = coverOf(adventure);

  return (
    <Player
      story={story}
      draft={{ adventureId: adventure.id }}
      cover={
        cover ? (
          <EntryImg image={cover} alt="" />
        ) : (
          <img src="/paths-art/lantern-path.webp" alt="" />
        )
      }
      from={from}
      onFromHandled={() =>
        void navigate({
          to: '/paths/$adventureId/play',
          params: { adventureId: adventure.id },
          search: {},
          replace: true,
        })
      }
      renderBody={(p) => <DraftProse passageId={p.id} />}
      renderArt={(p) => <DraftArt passage={p} />}
      nav={(currentId) => (
        <Link
          to="/paths/$adventureId"
          params={{ adventureId: adventure.id }}
          search={currentId ? { passage: currentId } : {}}
          className="text-muted hover:text-accent"
        >
          ← Back to the story map
        </Link>
      )}
    />
  );
}

function DraftProse({ passageId }: { passageId: string }) {
  const body = useBody(passageId);
  return (
    <Prose
      doc={body.data === undefined ? undefined : (body.data?.doc ?? null)}
      error={!!body.error}
    />
  );
}

function DraftArt({ passage }: { passage: PlayablePassage }) {
  const cover = coverOf(passage as Entry);
  return cover ? <EntryImg image={cover} alt="" className="sp-page-art" /> : null;
}
