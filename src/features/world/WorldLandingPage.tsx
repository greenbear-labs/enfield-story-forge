import { Link } from '@tanstack/react-router';
import { AppLink } from '../../app/AppLink';
import { Wordmark } from '../../app/AppSwitcher';
import { signInPath } from '../../app/hosts';
import { useAppTitle } from '../../app/useAppTitle';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useAuthStore } from '../auth/authStore';

const WAYS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'world',
    title: 'Notebooks of anything',
    text: 'A notebook for each world, campaign, or research project, with indexes for its places, peoples, creatures, and magic.',
  },
  {
    icon: 'grid',
    title: 'See it your way',
    text: 'Every index is a table, a gallery, or a list, with the columns you choose. Every entry opens as a full page.',
  },
  {
    icon: 'web',
    title: 'Everything connected',
    text: 'Type @ to link a page to any other. Pages hold pages, and the whole notebook exports when you want it.',
  },
];

/** World Creator's own front door, for people who come looking for it first. */
export function WorldLandingPage() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const signIn = signInPath('world');
  useAppTitle('world');

  return (
    <div className="world-app flex flex-col" data-sec="world">
      <header className="flex items-center justify-between gap-3 px-5 py-3 max-sm:px-4">
        <span className="flex items-center gap-2">
          <Wordmark tagline="Enfield" app="world" />
        </span>
        <Link to={signedIn ? '/world' : signIn} className="btn btn-small">
          {signedIn ? 'Open your worlds' : 'Sign in'}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-12 px-5 pt-12 pb-16 max-sm:px-4 max-sm:pt-8">
        <section className="flex max-w-[640px] flex-col gap-4">
          <div className="label text-accent">Enfield World Creator</div>
          <h1 className="text-[2.6rem] leading-[1.1] max-sm:text-[2rem]">
            Build a world worth getting lost in.
          </h1>
          <p className="text-[1.05rem] text-muted">
            A calm place to keep every map, kingdom, creature, and spell of your world, organized
            the way you think about it and always one link away from the rest.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {signedIn ? (
              <Link to="/world" className="btn btn-primary px-5 py-2.5 text-base">
                Open your worlds
              </Link>
            ) : (
              <>
                <Link
                  to={signIn}
                  search={{ signUp: true }}
                  className="btn btn-primary px-5 py-2.5 text-base"
                >
                  Start your first world
                </Link>
                <Link to={signIn} className="btn px-5 py-2.5 text-base">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        <section
          aria-label="What it does"
          className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1"
        >
          {WAYS.map((w) => (
            <div key={w.title} className="panel flex flex-col gap-2 border-t-4 border-t-accent">
              <span className="text-accent">
                <Icon name={w.icon} />
              </span>
              <h2 className="text-[1.1rem]">{w.title}</h2>
              <p className="text-[0.9rem] text-muted">{w.text}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="family" className="flex max-w-[640px] flex-col gap-2">
          <h2 id="family" className="text-[1.1rem]">
            Part of the Enfield family
          </h2>
          <p className="text-[0.9rem] text-muted">
            One account opens every Enfield app. Writers can use their places and peoples in{' '}
            <AppLink app="forge" className="text-accent underline">
              Enfield Story Forge
            </AppLink>{' '}
            and{' '}
            <AppLink app="paths" className="text-accent underline">
              Enfield Shadow Paths
            </AppLink>
            .
          </p>
        </section>
      </main>

      <footer className="px-5 py-6 text-center text-[0.8rem] text-muted">
        Green Bear Labs · Your worlds are yours. They’re never used to train AI.
      </footer>
    </div>
  );
}
