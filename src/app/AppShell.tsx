import { Outlet } from '@tanstack/react-router';
import { TopBar } from './TopBar';

/** The signed-in layout: top bar, station bar, and the page. */
export function AppShell() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-[1180px] flex-col gap-[22px] px-5 pt-[22px] pb-20 max-sm:px-4 max-sm:pt-4">
        <Outlet />
      </main>
    </>
  );
}
