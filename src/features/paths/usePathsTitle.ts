import { useEffect } from 'react';

/** Shadow Paths pages carry their own name in the browser tab. */
export function usePathsTitle(page?: string) {
  useEffect(() => {
    const before = document.title;
    document.title = page ? `${page} · Shadow Paths` : 'Enfield Shadow Paths';
    return () => {
      document.title = before;
    };
  }, [page]);
}
