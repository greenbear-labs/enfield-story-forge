import { Link } from '@tanstack/react-router';
import { Wordmark } from '../../app/AppSwitcher';
import { LANDING_PATH, SIGN_IN_PATH } from '../../app/appPaths';
import { useAuthStore } from '../auth/authStore';
import { usePathsTitle } from './usePathsTitle';

const WAYS = [
  {
    img: '/paths-art/ashwood.webp',
    title: 'Play',
    text: 'Step into stories that fork in the dark. Every choice opens one door and quietly closes another.',
  },
  {
    img: '/paths-art/book-magic.webp',
    title: 'Build',
    text: 'Write your own adventure: passages, choices, and endings, laid out like a map you can walk.',
  },
  {
    img: '/paths-art/trophies.webp',
    title: 'Collect',
    text: 'Hunt down every ending, true, secret, and grim, and earn gems to unlock the paths that stay hidden.',
  },
];

/** Shadow Paths' own front door, for people who come looking for it first. */
export function PathsLandingPage() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const signIn = SIGN_IN_PATH.paths;
  usePathsTitle();

  return (
    <div className="paths-app flex flex-col" data-sec="paths">
      <section
        aria-label="Shadow Paths"
        className="relative flex min-h-[86dvh] flex-col overflow-hidden"
      >
        <img
          src="/paths-art/hero-forest.webp"
          alt=""
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(10_18_17/0.55)_0%,rgb(10_18_17/0.25)_40%,rgb(10_18_17/0.95)_100%)]"
        />
        <header className="relative flex items-center justify-between gap-3 px-5 py-3 max-sm:px-4">
          <span className="flex items-center gap-2">
            <Wordmark tagline="Enfield" app="paths" />
          </span>
          <Link to={signedIn ? '/paths' : signIn} className="btn btn-small">
            {signedIn ? 'Enter' : 'Sign in'}
          </Link>
        </header>
        <div className="relative mx-auto flex w-full max-w-[1000px] flex-1 flex-col items-center justify-center gap-5 px-5 pb-16 text-center max-sm:px-4">
          <span className="label text-[var(--mist)]">Enfield presents</span>
          <h1 className="paths-glow text-[4.2rem] leading-[1] max-sm:text-[2.9rem]">
            Shadow Paths
          </h1>
          <p className="max-w-[560px] font-display text-[1.25rem] text-ink italic max-sm:text-[1.08rem]">
            Somewhere between the last streetlight and the first star, the path divides. Choose a
            way, follow the lantern, and see which ending finds you.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {signedIn ? (
              <Link to="/paths" className="btn btn-primary px-6 py-2.5 text-base">
                Enter Shadow Paths
              </Link>
            ) : (
              <>
                <Link
                  to={signIn}
                  search={{ signUp: true }}
                  className="btn btn-primary px-6 py-2.5 text-base"
                >
                  Begin your journey
                </Link>
                <Link to={signIn} className="btn px-6 py-2.5 text-base">
                  I’ve been here before
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-14 px-5 pt-6 pb-16 max-sm:px-4">
        <section aria-labelledby="ways" className="flex flex-col gap-5">
          <h2 id="ways" className="text-center text-[2rem] max-sm:text-[1.6rem]">
            Three ways to wander
          </h2>
          <div className="grid grid-cols-3 gap-4 max-[820px]:grid-cols-1">
            {WAYS.map((w) => (
              <article
                key={w.title}
                className="panel flex flex-col overflow-hidden p-0 shadow-[0_0_30px_rgb(0_0_0/0.4)]"
              >
                <img
                  src={w.img}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="flex flex-col gap-1.5 p-4">
                  <h3 className="text-[1.5rem] text-accent">{w.title}</h3>
                  <p className="text-muted">{w.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-label="The lantern path"
          className="paths-banner flex min-h-[300px] items-center p-8 max-sm:p-5"
        >
          <img src="/paths-art/lantern-path.webp" alt="" loading="lazy" />
          <div className="paths-banner-body flex max-w-[480px] flex-col gap-3">
            <h2 className="text-[1.8rem] max-sm:text-[1.5rem]">
              Every choice leads somewhere.
              <br />
              <em className="text-accent">Not every path leads home.</em>
            </h2>
            <p className="text-muted">
              Death endings, true endings, secret endings you only find on the third try. Your
              progress is kept for every story, so you can always go back and take the other road.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="family"
          className="grid grid-cols-[200px_1fr] items-center gap-6 max-sm:grid-cols-1 max-sm:text-center"
        >
          <img
            src="/paths-art/storybook.webp"
            alt=""
            loading="lazy"
            className="w-[200px] max-sm:mx-auto max-sm:w-[150px]"
          />
          <div className="flex flex-col gap-2">
            <h2 id="family" className="text-[1.6rem]">
              Part of the Enfield family
            </h2>
            <p className="text-muted">
              One account opens every Enfield app. Writers who plan their books in{' '}
              <Link to={LANDING_PATH.forge} className="text-accent underline">
                Enfield Story Forge
              </Link>{' '}
              and{' '}
              <Link to={LANDING_PATH.world} className="text-accent underline">
                Enfield World Creator
              </Link>{' '}
              can bring their characters and worlds along for the walk.
            </p>
          </div>
        </section>
      </main>

      <footer className="px-5 py-6 text-center text-[0.8rem] text-muted">
        Green Bear Labs · Enfield Shadow Paths
      </footer>
    </div>
  );
}
