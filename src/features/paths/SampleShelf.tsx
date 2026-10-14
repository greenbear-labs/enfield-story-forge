import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from '../../components/ui/toast';
import { useEntries } from '../../lib/entries/hooks';
import { publishStory, useLibrary } from '../../lib/entries/publish';
import { useAuthStore } from '../auth/authStore';
import { addSample, sampleKeyOf } from './sampleModel';
import { SAMPLE_STORIES, type SampleStory } from './samples';

/**
 * The sample stories. A writer adds one to their adventures to play it and
 * see how it's built; the admin can also put one straight in the library.
 */
export function SampleShelf({ admin = false }: { admin?: boolean }) {
  const adventures = useEntries('adventure').data;
  const library = useLibrary().data;
  const copyOf = (key: string) => adventures?.find((a) => sampleKeyOf(a) === key);

  return (
    <section className="flex flex-col gap-2.5" aria-label="Sample stories">
      <h2 className={admin ? 'text-[1.3rem]' : 'text-[1.05rem]'}>Sample stories</h2>
      <p className="text-[0.88rem] text-muted">
        {admin
          ? 'Put a sample in the library for everyone to play. It’s added to your adventures too, so you can change it and update the copy.'
          : 'Short spooky stories to play, then open up to see how the choices, items, and endings are built.'}
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {SAMPLE_STORIES.map((sample) => (
          <li key={sample.key}>
            <SampleCard
              sample={sample}
              copyId={copyOf(sample.key)?.id ?? null}
              inLibrary={!!library?.some((s) => s.id === copyOf(sample.key)?.id)}
              admin={admin}
              loaded={adventures !== undefined}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SampleCard({
  sample,
  copyId,
  inLibrary,
  admin,
  loaded,
}: {
  sample: SampleStory;
  copyId: string | null;
  inLibrary: boolean;
  admin: boolean;
  loaded: boolean;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const count = Object.keys(sample.passages).length;
  const endings = Object.values(sample.passages).filter((p) => p.ending).length;

  const add = () => {
    const { adventure } = addSample(ws, sample);
    toast(`“${sample.title}” is in your adventures.`);
    void navigate({ to: '/paths/$adventureId', params: { adventureId: adventure.id } });
  };
  const publish = () => {
    setBusy(true);
    const made = addSample(ws, sample);
    publishStory(ws, made.adventure, made.passages, 'public', made.bodies).then(
      () => {
        setBusy(false);
        toast(`“${sample.title}” is in the library.`);
      },
      (err: unknown) => {
        console.error('Could not publish the sample', err);
        setBusy(false);
        toast('Couldn’t publish the sample. Check your connection and try again.');
      },
    );
  };

  return (
    <article className="entry-card h-full">
      <img src={sample.cover} alt="" loading="lazy" className="card-cover" />
      <b className="font-display text-[1.05rem]">{sample.title}</b>
      <p className="text-[0.88rem] text-muted">{sample.blurb}</p>
      <span className="text-[0.8rem] text-muted">
        {count} passages · {endings} endings
      </span>
      <span className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {copyId ? (
          <>
            <Link
              to="/paths/$adventureId"
              params={{ adventureId: copyId }}
              className="btn btn-small"
            >
              Open your copy
            </Link>
            {admin && inLibrary && <span className="chip">In the library</span>}
          </>
        ) : admin ? (
          <button
            type="button"
            className="btn btn-primary btn-small"
            disabled={!loaded || busy}
            onClick={publish}
          >
            {busy ? 'Publishing…' : 'Put in the library'}
          </button>
        ) : (
          <button type="button" className="btn btn-small" disabled={!loaded} onClick={add}>
            Add to my adventures
          </button>
        )}
      </span>
    </article>
  );
}
