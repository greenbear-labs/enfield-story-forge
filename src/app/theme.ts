import { create } from 'zustand';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'esf-theme';

function readSaved(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
}

interface ThemeState {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
  cycle: () => void;
}

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

/** Theme follows the system by default; the toggle cycles system, light, dark. */
export const useThemeStore = create<ThemeState>((set, get) => ({
  choice: typeof window === 'undefined' ? 'system' : readSaved(),
  setChoice: (choice) => {
    apply(choice);
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      // Storage can be blocked; the choice still applies for this visit.
    }
    set({ choice });
  },
  cycle: () => {
    const next = ORDER[(ORDER.indexOf(get().choice) + 1) % ORDER.length] ?? 'system';
    get().setChoice(next);
  },
}));
