import { create } from 'zustand';

interface ToastState {
  message: string | null;
  key: number;
}

export const useToastStore = create<ToastState>(() => ({ message: null, key: 0 }));

let timer: ReturnType<typeof setTimeout> | undefined;

/** Show a short status message at the bottom of the screen. */
export function toast(message: string, ms = 2600): void {
  clearTimeout(timer);
  useToastStore.setState((s) => ({ message, key: s.key + 1 }));
  timer = setTimeout(() => useToastStore.setState({ message: null }), ms);
}

export const COMING_SOON = 'Shown for layout. This part comes in a later build.';
