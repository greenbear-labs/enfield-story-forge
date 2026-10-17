import { useAppTitle } from '../../app/useAppTitle';

/** Shadow Paths pages carry their own name in the browser tab. */
export function usePathsTitle(page?: string) {
  useAppTitle('paths', page);
}
