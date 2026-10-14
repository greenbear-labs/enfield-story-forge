import { Link } from '@tanstack/react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Loading } from '../../components/ui/Loading';
import { useEntries } from '../../lib/entries/hooks';
import { usePlays } from '../../lib/entries/plays';
import { useMyPublished } from '../../lib/entries/publish';
import { useAuthStore } from '../auth/authStore';
import { ENDING_TYPES } from './pathsModel';
import { isShared } from './publishModel';
import {
  GEMS_FOR,
  gemBalance,
  gemsEarned,
  gemsSpent,
  gemsText,
  isReaderPlay,
  medals,
  readerStats,
  type Medal,
} from './rewardsModel';
import { usePathsTitle } from './usePathsTitle';

/** The reader's profile: gems, medals and trophies, and the stories they've played. */
export function ProfilePage() {
  usePathsTitle('Your profile');
  const name = useAuthStore((s) => s.user?.displayName);
  const plays = usePlays();
  const adventures = useEntries('adventure').data;
  const mine = useMyPublished().data;

  if (plays.error)
    return <EmptyState>Couldn’t load your profile. Check your connection and reload.</EmptyState>;
  if (!plays.data) return <Loading />;

  const all = plays.data;
  const gems = gemBalance(all);
  const writer = {
    built: adventures?.length ?? 0,
    shared: mine?.filter((s) => isShared(s.status)).length ?? 0,
    inLibrary: mine?.filter((s) => s.status === 'public').length ?? 0,
  };
  const earned = medals(readerStats(all), writer);
  const played = [...all]
    .filter(([id, p]) => isReaderPlay(id) && (p.path.length > 0 || Object.keys(p.endings).length))
    .map(([id, p]) => ({ id: id.slice('pub_'.length), play: p }))
    .sort((a, b) => a.play.title.localeCompare(b.play.title));

  return (
    <>
      <header className="paths-banner flex min-h-[200px] items-end p-7 max-sm:p-5">
        <img src="/paths-art/trophies.webp" alt="" fetchPriority="high" />
        <div className="paths-banner-body flex max-w-[560px] flex-col items-start gap-2">
          <span className="label text-accent">Your profile</span>
          <h1 className="paths-glow text-[2.4rem] leading-[1.05] max-sm:text-[1.9rem]">
            {name || 'Wanderer'}
          </h1>
          <p className="flex items-center gap-2 font-display text-[1.4rem] text-accent">
            <Icon name="gem" size={22} /> {gemsText(gems)}
          </p>
          <p className="text-[0.88rem] text-ink/85">
            Earned {gemsEarned(all)}, spent {gemsSpent(all)}.
          </p>
        </div>
      </header>

      <section className="panel flex flex-col gap-2 text-[0.9rem]" aria-label="How gems work">
        <h2 className="text-[1.15rem]">How gems work</h2>
        <p>
          Find an ending in a published story for the first time to earn gems:{' '}
          {ENDING_TYPES.map((t) => `${t.label.toLowerCase()} ${GEMS_FOR[t.key]}`).join(', ')}. Some
          choices cost gems to unlock; once unlocked, they stay open for you.
        </p>
      </section>

      <MedalShelf title="Medals" medals={earned.filter((m) => m.def.side === 'reader')} />
      <MedalShelf title="Trophies" medals={earned.filter((m) => m.def.side === 'writer')} />

      <section className="flex flex-col gap-2.5" aria-label="Stories you’ve played">
        <h2 className="text-[1.3rem]">Stories you’ve played</h2>
        {played.length === 0 ? (
          <EmptyState>
            None yet.{' '}
            <Link to="/paths/library" className="text-accent underline">
              Find one in the library
            </Link>
            .
          </EmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {played.map(({ id, play }) => {
              const found = Object.keys(play.endings).length;
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <Link
                    to="/paths/read/$storyId"
                    params={{ storyId: id }}
                    className="min-w-0 flex-1 basis-[200px] font-display text-[1.1rem] hover:text-accent"
                  >
                    {play.title || 'A story'}
                  </Link>
                  <span className="text-[0.85rem] text-muted">
                    {play.total > 0
                      ? `${Math.min(found, play.total)} of ${play.total} ${play.total === 1 ? 'ending' : 'endings'} found`
                      : `${found} ${found === 1 ? 'ending' : 'endings'} found`}
                  </span>
                  {play.total > 0 && found >= play.total && <span className="chip">Complete</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function MedalShelf({ title, medals }: { title: string; medals: Medal[] }) {
  return (
    <section className="flex flex-col gap-2.5" aria-label={title}>
      <h2 className="text-[1.3rem]">{title}</h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {medals.map((m) => (
          <li key={m.def.key} className="sp-medal" data-tier={m.tier ?? undefined}>
            <span className="sp-medal-disc" aria-hidden="true">
              {m.def.name[0]}
            </span>
            <b className="font-display text-[1.05rem]">{m.def.name}</b>
            <span className="text-[0.8rem] text-accent">{m.tier ?? 'Not yet'}</span>
            <span className="text-[0.8rem] text-muted">
              {m.def.counts}: {m.value}
              {m.next !== null && ` · next at ${m.next}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
