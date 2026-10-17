import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { Wordmark, type EnfieldApp } from '../../app/AppSwitcher';
import { LANDING_PATH } from '../../app/appPaths';
import { useAppTitle } from '../../app/useAppTitle';
import { Icon } from '../../components/ui/Icon';
import { isFirebaseConfigured } from '../../lib/firebase/config';
import {
  authErrorMessage,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './authActions';
import { useAuthStore } from './authStore';
import { safeRedirect } from './safeRedirect';

type Mode = 'signIn' | 'signUp' | 'reset';

const LOOK = {
  forge: {
    className: 'flex min-h-dvh flex-col',
    sec: 'home',
    home: '/hub',
    name: 'Story Forge',
    welcome: 'Welcome to the Story Forge.',
  },
  world: {
    className: 'world-app flex flex-col',
    sec: 'world',
    home: '/world',
    name: 'World Creator',
    welcome: 'Welcome to the World Creator. Your worlds are waiting.',
  },
  paths: {
    className: 'paths-app flex flex-col',
    sec: 'paths',
    home: '/paths',
    name: 'Shadow Paths',
    welcome: 'Welcome, traveler. Your path is waiting.',
  },
} as const;

const TITLES: Record<Mode, string> = {
  signIn: 'Sign in',
  signUp: 'Create an account',
  reset: 'Reset your password',
};

export function SignInPage({
  redirect,
  signUp,
  app = 'forge',
}: {
  redirect?: string;
  /** Open on "Create an account". */
  signUp?: boolean;
  /** Each app has its own sign-in page, in its own look. Same account. */
  app?: EnfieldApp;
}) {
  const look = LOOK[app];
  useAppTitle(app, 'Sign in');
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(signUp ? 'signUp' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const signedIn = useAuthStore((s) => s.status === 'signedIn');

  // Leave once Firebase reports the user (also covers visiting this page while signed in).
  useEffect(() => {
    if (signedIn)
      void navigate({
        href: safeRedirect(redirect, undefined, look.home),
        replace: true,
      });
  }, [signedIn, redirect, navigate, look.home]);

  const run = async (action: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      after?.();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'reset') {
      void run(
        () => resetPassword(email),
        () => setNotice('If there’s an account for that email, a reset link is on its way.'),
      );
    } else if (mode === 'signUp') {
      void run(() => signUpWithEmail(email, password));
    } else {
      void run(() => signInWithEmail(email, password));
    }
  };

  return (
    <div className={look.className} data-sec={look.sec}>
      <header className="px-5 py-3 max-sm:px-4">
        <Link
          to={LANDING_PATH[app]}
          className="inline-flex items-center gap-2"
          aria-label={`${look.name} home`}
        >
          <Wordmark tagline="Enfield" app={app} />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-16 max-sm:pt-4">
        <div className="panel flex w-full max-w-[400px] flex-col gap-4 p-6 max-sm:p-5">
          <div>
            <h1 className="text-[1.6rem]">{TITLES[mode]}</h1>
            <p className="text-muted">
              {mode === 'reset' ? 'We’ll email you a link to choose a new password.' : look.welcome}
            </p>
          </div>

          {!isFirebaseConfigured && (
            <p role="alert" className="rounded-md bg-sunken p-3 text-[0.85rem]">
              Sign-in isn’t configured on this build (missing Firebase settings).
            </p>
          )}

          {mode !== 'reset' && (
            <>
              <button
                type="button"
                className="btn w-full py-2"
                disabled={busy || !isFirebaseConfigured}
                onClick={() => void run(signInWithGoogle)}
              >
                <Icon name="google" />
                Continue with Google
              </button>
              <div className="flex items-center gap-3 text-[0.8rem] text-muted">
                <span className="h-px flex-1 bg-line" />
                or with email
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-[0.85rem] font-medium">Email</span>
              <input
                className="txt"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode !== 'reset' && (
              <label className="flex flex-col gap-1">
                <span className="flex items-center justify-between text-[0.85rem] font-medium">
                  Password
                  {mode === 'signIn' && (
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0 text-[0.8rem] font-medium text-accent"
                      onClick={() => switchMode('reset')}
                    >
                      Forgot password?
                    </button>
                  )}
                </span>
                <input
                  className="txt"
                  type="password"
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}

            {error && (
              <p role="alert" className="text-[0.85rem] text-[var(--sec-char)]">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-[0.85rem] text-brand">
                {notice}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full py-2"
              disabled={busy || !isFirebaseConfigured}
            >
              {mode === 'signIn'
                ? 'Sign in'
                : mode === 'signUp'
                  ? 'Create account'
                  : 'Send reset link'}
            </button>
          </form>

          <p className="text-center text-[0.85rem] text-muted">
            {mode === 'signIn' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 font-semibold text-accent"
                  onClick={() => switchMode('signUp')}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                {mode === 'signUp' ? 'Already have an account? ' : 'Remembered it? '}
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 font-semibold text-accent"
                  onClick={() => switchMode('signIn')}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
