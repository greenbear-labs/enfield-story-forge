import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  message: string | null;
  action?: ToastAction;
  key: number;
}

export const useToastStore = create<ToastState>(() => ({ message: null, key: 0 }));

let timer: ReturnType<typeof setTimeout> | undefined;

/** Show a short status message at the bottom of the screen, with an optional action (e.g. Undo). */
export function toast(message: string, options: { action?: ToastAction; ms?: number } = {}): void {
  const { action, ms = action ? 6000 : 2600 } = options;
  clearTimeout(timer);
  useToastStore.setState((s) => ({ message, action, key: s.key + 1 }));
  timer = setTimeout(() => useToastStore.setState({ message: null, action: undefined }), ms);
}

export function dismissToast(): void {
  clearTimeout(timer);
  useToastStore.setState({ message: null, action: undefined });
}

export const COMING_SOON = 'Shown for layout. This part comes in a later build.';
