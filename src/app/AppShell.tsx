import { Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';
import { Loading } from '../components/ui/Loading';
import { CaptureShardDialog } from '../features/shards/CaptureShardDialog';
import { TopBar } from './TopBar';

/** The signed-in layout: top bar, station bar, and the page. */
export function AppShell() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <TopBar />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex max-w-[1180px] flex-col gap-[22px] px-5 pt-[22px] pb-20 max-sm:px-4 max-sm:pt-4"
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <CaptureShardDialog />
    </>
  );
}
