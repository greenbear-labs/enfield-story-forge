import { lazy, type ComponentType } from 'react';
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
import { CHARACTER_VIEWS, type CharacterView } from '../features/characters/characterModel';
import { AppShell } from './AppShell';
import { usePathsTitle } from '../features/paths/usePathsTitle';
import { PathsShell } from './PathsShell';
import { WorldShell } from './WorldShell';

/** A page loaded the first time it's opened, so the first screen loads faster. */
function lazyPage<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  const page = lazy(async () => ({
    default: (await load())[name] as unknown as ComponentType<object>,
  }));
  return page as unknown as M[K];
}

const FeedbackInboxPage = lazyPage(
  () => import('../features/feedback/FeedbackInboxPage'),
  'FeedbackInboxPage',
);
const AppendixPage = lazyPage(() => import('../features/appendix/AppendixPage'), 'AppendixPage');
const CharacterInterviewPage = lazyPage(
  () => import('../features/characters/CharacterInterviewPage'),
  'CharacterInterviewPage',
);
const CharacterPage = lazyPage(
  () => import('../features/characters/CharacterPage'),
  'CharacterPage',
);
const RelationshipWebPage = lazyPage(
  () => import('../features/characters/RelationshipWebPage'),
  'RelationshipWebPage',
);
const CharactersStationPage = lazyPage(
  () => import('../features/characters/CharactersStationPage'),
  'CharactersStationPage',
);
const ConceptGeneratorPage = lazyPage(
  () => import('../features/concepts/ConceptGeneratorPage'),
  'ConceptGeneratorPage',
);
const ConceptPage = lazyPage(() => import('../features/concepts/ConceptPage'), 'ConceptPage');
const ConceptsStationPage = lazyPage(
  () => import('../features/concepts/ConceptsStationPage'),
  'ConceptsStationPage',
);
const MashupPage = lazyPage(() => import('../features/concepts/MashupPage'), 'MashupPage');
const ShardGroupPage = lazyPage(
  () => import('../features/shards/ShardGroupPage'),
  'ShardGroupPage',
);
const ShardMinesPage = lazyPage(
  () => import('../features/shards/ShardMinesPage'),
  'ShardMinesPage',
);
const ShardPage = lazyPage(() => import('../features/shards/ShardPage'), 'ShardPage');
const ShardsStationPage = lazyPage(
  () => import('../features/shards/ShardsStationPage'),
  'ShardsStationPage',
);
const NewOutlinePage = lazyPage(
  () => import('../features/outlines/NewOutlinePage'),
  'NewOutlinePage',
);
const StructurePage = lazyPage(() => import('../features/outlines/StructurePage'), 'StructurePage');
const OutlinePage = lazyPage(() => import('../features/outlines/OutlinePage'), 'OutlinePage');
const OutlinesStationPage = lazyPage(
  () => import('../features/outlines/OutlinesStationPage'),
  'OutlinesStationPage',
);
const BreakdownPage = lazyPage(() => import('../features/desk/BreakdownPage'), 'BreakdownPage');
const ChapterPage = lazyPage(() => import('../features/desk/ChapterPage'), 'ChapterPage');
const CompilePage = lazyPage(() => import('../features/desk/CompilePage'), 'CompilePage');
const HealthPage = lazyPage(() => import('../features/desk/HealthPage'), 'HealthPage');
const DeskStationPage = lazyPage(
  () => import('../features/desk/DeskStationPage'),
  'DeskStationPage',
);
const ManuscriptPage = lazyPage(() => import('../features/desk/ManuscriptPage'), 'ManuscriptPage');
const ScenePage = lazyPage(() => import('../features/desk/ScenePage'), 'ScenePage');
const IndexPage = lazyPage(() => import('../features/world/IndexPage'), 'IndexPage');
const NotebookPage = lazyPage(() => import('../features/world/NotebookPage'), 'NotebookPage');
const NotebookPrintPage = lazyPage(
  () => import('../features/world/NotebookPrintPage'),
  'NotebookPrintPage',
);
const WorldHomePage = lazyPage(() => import('../features/world/WorldHomePage'), 'WorldHomePage');
const WorldPagePage = lazyPage(() => import('../features/world/WorldPagePage'), 'WorldPagePage');

const AdventurePage = lazyPage(() => import('../features/paths/AdventurePage'), 'AdventurePage');
const PathsLandingPage = lazyPage(
  () => import('../features/paths/PathsLandingPage'),
  'PathsLandingPage',
);
const PathsHomePage = lazyPage(() => import('../features/paths/PathsHomePage'), 'PathsHomePage');

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

/** Shadow Paths' own front door and sign-in, so it can stand on its own. */
const pathsLandingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shadow-paths',
  component: PathsLandingPage,
});
const pathsSignInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shadow-paths/sign-in',
  validateSearch: signInRoute.options.validateSearch,
  component: function PathsSignInRouteComponent() {
    const { redirect, signUp } = pathsSignInRoute.useSearch();
    usePathsTitle('Sign in');
    return <SignInPage app="paths" redirect={redirect} startWithSignUp={signUp} />;
  },
});

/** Enfield Shadow Paths: its own app, with its own shell. Signed-out visitors sign in there. */
const pathsRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'paths',
  beforeLoad: async ({ location }: { location: { href: string } }) => {
    const auth = await authReady();
    if (!auth.user) {
      throw redirect({ to: '/shadow-paths/sign-in', search: { redirect: location.href } });
    }
  },
  component: PathsShell,
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
const structureRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/outlines/structures/$structureId',
  component: function StructureRouteComponent() {
    const { structureId } = structureRoute.useParams();
    return <StructurePage key={structureId} structureId={structureId} />;
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
  // import: open "Import a draft" straight away (from the welcome tour).
  validateSearch: (search: Record<string, unknown>): { import?: boolean } => ({
    import: search.import === true || search.import === 'true' ? true : undefined,
  }),
  component: function DeskRouteComponent() {
    const { import: openImport } = deskRoute.useSearch();
    return <DeskStationPage openImport={!!openImport} />;
  },
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
const healthRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk/$bookId/health',
  component: function HealthRouteComponent() {
    const { bookId } = healthRoute.useParams();
    return <HealthPage key={bookId} bookId={bookId} />;
  },
});
const compileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/desk/$bookId/compile',
  component: function CompileRouteComponent() {
    const { bookId } = compileRoute.useParams();
    return <CompilePage key={bookId} bookId={bookId} />;
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
  // story: show one story's cast ("none" for characters in no story yet); view: list or casts.
  validateSearch: (search: Record<string, unknown>): { story?: string; view?: CharacterView } => ({
    story: optionalString(search.story),
    view: CHARACTER_VIEWS.find((v) => v.key === search.view && v.key !== 'cards')?.key,
  }),
  component: function CharactersRouteComponent() {
    const { story, view } = charactersRoute.useSearch();
    return <CharactersStationPage story={story ?? null} view={view ?? 'cards'} />;
  },
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
const relationshipWebRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/characters/web',
  // story: only that story's cast; focus: the character whose ties are shown.
  validateSearch: (search: Record<string, unknown>): { story?: string; focus?: string } => ({
    story: optionalString(search.story),
    focus: optionalString(search.focus),
  }),
  component: function RelationshipWebRouteComponent() {
    const { story, focus } = relationshipWebRoute.useSearch();
    return <RelationshipWebPage story={story} focus={focus} />;
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

const feedbackRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/feedback',
  component: FeedbackInboxPage,
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
const notebookPrintRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/world/$notebookId/print',
  component: function NotebookPrintRouteComponent() {
    const { notebookId } = notebookPrintRoute.useParams();
    return <NotebookPrintPage key={notebookId} notebookId={notebookId} />;
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

const pathsHomeRoute = createRoute({
  getParentRoute: () => pathsRoute,
  path: '/paths',
  component: PathsHomePage,
});
const adventureRoute = createRoute({
  getParentRoute: () => pathsRoute,
  path: '/paths/$adventureId',
  component: function AdventureRouteComponent() {
    const { adventureId } = adventureRoute.useParams();
    return <AdventurePage adventureId={adventureId} />;
  },
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  signInRoute,
  pathsLandingRoute,
  pathsSignInRoute,
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
    structureRoute,
    outlineRoute,
    deskRoute,
    manuscriptRoute,
    breakdownRoute,
    compileRoute,
    healthRoute,
    chapterRoute,
    sceneRoute,
    charactersRoute,
    characterInterviewRoute,
    relationshipWebRoute,
    characterRoute,
    appendixRoute,
    feedbackRoute,
  ]),
  worldRoute.addChildren([
    worldHomeRoute,
    notebookRoute,
    notebookPrintRoute,
    indexRoute,
    worldPageRoute,
  ]),
  pathsRoute.addChildren([pathsHomeRoute, adventureRoute]),
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
