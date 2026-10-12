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
import { AppendixPage } from '../features/appendix/AppendixPage';
import { CharacterInterviewPage } from '../features/characters/CharacterInterviewPage';
import { CharacterPage } from '../features/characters/CharacterPage';
import { CharactersStationPage } from '../features/characters/CharactersStationPage';
import { ConceptGeneratorPage } from '../features/concepts/ConceptGeneratorPage';
import { ConceptPage } from '../features/concepts/ConceptPage';
import { ConceptsStationPage } from '../features/concepts/ConceptsStationPage';
import { MashupPage } from '../features/concepts/MashupPage';
import { ShardGroupPage } from '../features/shards/ShardGroupPage';
import { ShardMinesPage } from '../features/shards/ShardMinesPage';
import { ShardPage } from '../features/shards/ShardPage';
import { ShardsStationPage } from '../features/shards/ShardsStationPage';
import { NewOutlinePage } from '../features/outlines/NewOutlinePage';
import { OutlinePage } from '../features/outlines/OutlinePage';
import { OutlinesStationPage } from '../features/outlines/OutlinesStationPage';
import { BreakdownPage } from '../features/desk/BreakdownPage';
import { ChapterPage } from '../features/desk/ChapterPage';
import { DeskStationPage } from '../features/desk/DeskStationPage';
import { ManuscriptPage } from '../features/desk/ManuscriptPage';
import { ScenePage } from '../features/desk/ScenePage';
import { IndexPage } from '../features/world/IndexPage';
import { NotebookPage } from '../features/world/NotebookPage';
import { WorldHomePage } from '../features/world/WorldHomePage';
import { WorldPagePage } from '../features/world/WorldPagePage';
import { AppShell } from './AppShell';
import { WorldShell } from './WorldShell';

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
const requireUser = async ({ location }: { location: { href: string } }) => {
  const auth = await authReady();
  if (!auth.user) {
    throw redirect({ to: '/sign-in', search: { redirect: location.href } });
  }
};

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireUser,
  component: AppShell,
});

/** Enfield World Creator: its own app, with its own shell. */
const worldRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'world',
  beforeLoad: requireUser,
  component: WorldShell,
});

const hubRoute = createRoute({ getParentRoute: () => appRoute, path: '/hub', component: HubPage });
const shardsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/shards',
  component: ShardsStationPage,
});
const shardMinesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/shards/mines',
  validateSearch: (search: Record<string, unknown>): { group?: string } => ({
    group: optionalString(search.group),
  }),
  component: function ShardMinesRouteComponent() {
    const { group } = shardMinesRoute.useSearch();
    return <ShardMinesPage targetGroupId={group} />;
  },
});
const shardGroupRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/shards/groups/$groupId',
  component: function ShardGroupRouteComponent() {
    const { groupId } = shardGroupRoute.useParams();
    return <ShardGroupPage groupId={groupId} />;
  },
});
const shardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/shards/$shardId',
  component: function ShardRouteComponent() {
    const { shardId } = shardRoute.useParams();
    return <ShardPage shardId={shardId} />;
  },
});
const conceptsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/concepts',
  component: ConceptsStationPage,
});
const conceptGeneratorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/concepts/generator',
  component: ConceptGeneratorPage,
});
const mashupRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/concepts/mashup',
  component: MashupPage,
});
const conceptRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/concepts/$conceptId',
  component: function ConceptRouteComponent() {
    const { conceptId } = conceptRoute.useParams();
    return <ConceptPage conceptId={conceptId} />;
  },
});
const outlinesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/outlines',
  component: OutlinesStationPage,
});
const newOutlineRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/outlines/new',
  validateSearch: (search: Record<string, unknown>): { concept?: string; character?: string } => ({
    concept: optionalString(search.concept),
    character: optionalString(search.character),
  }),
  component: function NewOutlineRouteComponent() {
    const { concept, character } = newOutlineRoute.useSearch();
    return (
      <NewOutlinePage key={`${concept}:${character}`} conceptId={concept} characterId={character} />
    );
  },
});
const outlineRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/outlines/$outlineId',
  component: function OutlineRouteComponent() {
    const { outlineId } = outlineRoute.useParams();
    return <OutlinePage outlineId={outlineId} />;
  },
});
const deskRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk',
  component: DeskStationPage,
});
const manuscriptRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk/$bookId',
  component: function ManuscriptRouteComponent() {
    const { bookId } = manuscriptRoute.useParams();
    return <ManuscriptPage bookId={bookId} />;
  },
});
const breakdownRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk/$bookId/breakdown',
  component: function BreakdownRouteComponent() {
    const { bookId } = breakdownRoute.useParams();
    return <BreakdownPage key={bookId} bookId={bookId} />;
  },
});
const chapterRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk/chapters/$chapterId',
  component: function ChapterRouteComponent() {
    const { chapterId } = chapterRoute.useParams();
    return <ChapterPage key={chapterId} chapterId={chapterId} />;
  },
});
const sceneRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk/scenes/$sceneId',
  component: function SceneRouteComponent() {
    const { sceneId } = sceneRoute.useParams();
    return <ScenePage key={sceneId} sceneId={sceneId} />;
  },
});
const charactersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/characters',
  component: CharactersStationPage,
});
const characterInterviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/characters/interview',
  validateSearch: (search: Record<string, unknown>): { character?: string } => ({
    character: optionalString(search.character),
  }),
  component: function CharacterInterviewRouteComponent() {
    const { character } = characterInterviewRoute.useSearch();
    return <CharacterInterviewPage key={character ?? ''} characterId={character} />;
  },
});
const characterRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/characters/$characterId',
  component: function CharacterRouteComponent() {
    const { characterId } = characterRoute.useParams();
    return <CharacterPage characterId={characterId} />;
  },
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

const worldHomeRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/world',
  component: WorldHomePage,
});
const notebookRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/world/$notebookId',
  component: function NotebookRouteComponent() {
    const { notebookId } = notebookRoute.useParams();
    return <NotebookPage key={notebookId} notebookId={notebookId} />;
  },
});
const indexRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/world/index/$indexId',
  component: function IndexRouteComponent() {
    const { indexId } = indexRoute.useParams();
    return <IndexPage key={indexId} indexId={indexId} />;
  },
});
const worldPageRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/world/pages/$pageId',
  component: function WorldPageRouteComponent() {
    const { pageId } = worldPageRoute.useParams();
    return <WorldPagePage key={pageId} pageId={pageId} />;
  },
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  signInRoute,
  appRoute.addChildren([
    hubRoute,
    shardsRoute,
    shardMinesRoute,
    shardGroupRoute,
    shardRoute,
    conceptsRoute,
    conceptGeneratorRoute,
    mashupRoute,
    conceptRoute,
    outlinesRoute,
    newOutlineRoute,
    outlineRoute,
    deskRoute,
    manuscriptRoute,
    breakdownRoute,
    chapterRoute,
    sceneRoute,
    charactersRoute,
    characterInterviewRoute,
    characterRoute,
    appendixRoute,
  ]),
  worldRoute.addChildren([worldHomeRoute, notebookRoute, indexRoute, worldPageRoute]),
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
