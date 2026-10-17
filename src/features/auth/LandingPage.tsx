import { Link } from '@tanstack/react-router';
import { LANDING_PATH } from '../../app/appPaths';
import { Wordmark } from '../../app/AppSwitcher';
import { Icon, type IconName } from '../../components/ui/Icon';
import type { Section } from '../../data/types';
import { useAuthStore } from './authStore';

const STEPS: { sec: Section; icon: IconName; title: string; text: string }[] = [
  {
    sec: 'shard',
    icon: 'shard',
    title: 'Catch the idea',
    text: 'Save every spark as a story shard: a place, a person, a moment, a “what if”.',
  },
  {
    sec: 'world',
    icon: 'world',
    title: 'Grow the world',
    text: 'Shape shards into concepts, characters, and the places your story lives.',
  },
  {
    sec: 'desk',
    icon: 'desk',
    title: 'Write the book',
    text: 'Outline with a proven structure, then write scene by scene, even offline.',
  },
];

export function LandingPage() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');

  return (
    <div className="flex min-h-dvh flex-col" data-sec="home">
      <header className="flex items-center justify-between gap-3 px-5 py-3 max-sm:px-4">
        <div className="flex items-center gap-2">
          <Wordmark tagline="Enfield" />
        </div>
        <Link to={signedIn ? '/hub' : '/sign-in'} className="btn btn-small">
          {signedIn ? 'Open the studio' : 'Sign in'}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-12 px-5 pt-12 pb-16 max-sm:px-4 max-sm:pt-8">
        <section className="flex max-w-[640px] flex-col gap-4">
          <div className="label text-accent">Enfield Story Forge</div>
          <h1 className="text-[2.6rem] leading-[1.1] max-sm:text-[2rem]">
            From a scattered spark to a finished story.
          </h1>
          <p className="text-[1.05rem] text-muted">
            A calm writing studio that keeps your shards, concepts, characters, outlines, and
            chapters connected, so every idea moves forward to the page.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {signedIn ? (
              <Link to="/hub" className="btn btn-primary px-5 py-2.5 text-base">
                Open the studio
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  search={{ signUp: true }}
                  className="btn btn-primary px-5 py-2.5 text-base"
                >
                  Create a free account
                </Link>
                <Link to="/sign-in" className="btn px-5 py-2.5 text-base">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        <section
          aria-label="How it works"
          className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1"
        >
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              data-sec={s.sec}
              className="panel flex flex-col gap-2 border-t-4 border-t-accent"
            >
              <span className="flex items-center gap-2 font-mono text-[0.75rem] text-accent">
                <Icon name={s.icon} />
                STEP {i + 1}
              </span>
              <h2 className="text-[1.1rem]">{s.title}</h2>
              <p className="text-[0.9rem] text-muted">{s.text}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="family" className="flex max-w-[640px] flex-col gap-2">
          <h2 id="family" className="text-[1.1rem]">
            Part of the Enfield family
          </h2>
          <p className="text-[0.9rem] text-muted">
            One account opens every Enfield app: build your setting in{' '}
            <Link to={LANDING_PATH.world} className="text-accent underline">
              Enfield World Creator
            </Link>
            , or turn a story into a choose-your-own adventure in{' '}
            <Link to={LANDING_PATH.paths} className="text-accent underline">
              Enfield Shadow Paths
            </Link>
            .
          </p>
        </section>
      </main>

      <footer className="px-5 py-6 text-center text-[0.8rem] text-muted">
        Green Bear Labs · Your writing is yours. It’s never used to train AI.
      </footer>
    </div>
  );
}
