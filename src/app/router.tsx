import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Toaster } from '../components/ui/Toaster';
import { authReady } from '../features/auth/authStore';
import { LandingPage } from '../features/auth/LandingPage';
import { SignInPage } from '../features/auth/SignInPage';
import { HubPage } from '../features/hub/HubPage';
import { AppendixPage } from '../features/stations/AppendixPage';
import {
  CharactersPage,
  ConceptsPage,
  DeskPage,
  OutlinesPage,
  ShardsPage,
} from '../features/stations/pages';
import { AppShell } from './AppShell';

const optionalString = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
      <h1>Page not found</h1>
      <p className="mt-2 text-muted">
        <a className="text-brand underline" href="/">
          Back to the start
        </a>
      </p>
    </div>
  ),
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  validateSearch: (search: Record<string, unknown>): { redirect?: string; signUp?: boolean } => ({
    redirect: optionalString(search.redirect),
    signUp: search.signUp === true || search.signUp === 'true' ? true : undefined,
  }),
  component: function SignInRouteComponent() {
    const { redirect, signUp } = signInRoute.useSearch();
    return <SignInPage redirect={redirect} startWithSignUp={signUp} />;
  },
});

/** Everything inside the studio needs a signed-in user. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ location }) => {
    const auth = await authReady();
    if (!auth.user) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
  component: AppShell,
});

const hubRoute = createRoute({ getParentRoute: () => appRoute, path: '/hub', component: HubPage });
const shardsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/shards',
  component: ShardsPage,
});
const conceptsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/concepts',
  component: ConceptsPage,
});
const outlinesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/outlines',
  component: OutlinesPage,
});
const deskRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk',
  component: DeskPage,
});
const charactersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/characters',
  component: CharactersPage,
});

const appendixRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/appendix',
  validateSearch: (search: Record<string, unknown>): { topic?: string } => ({
    topic: optionalString(search.topic),
  }),
  component: function AppendixRouteComponent() {
    const { topic } = appendixRoute.useSearch();
    return <AppendixPage topic={topic} />;
  },
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  signInRoute,
  appRoute.addChildren([
    hubRoute,
    shardsRoute,
    conceptsRoute,
    outlinesRoute,
    deskRoute,
    charactersRoute,
    appendixRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
