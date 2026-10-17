import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { hostApp } from './app/hosts';
import { router } from './app/router';
import { APP_TITLE } from './app/useAppTitle';
import { initAuth, useAuthStore } from './features/auth/authStore';
import { watchConnectivity } from './lib/firestore/sync';
import './styles/index.css';

// Each app's own address opens with its own name in the tab.
document.title = APP_TITLE[hostApp];

initAuth();
watchConnectivity();

// Re-run route guards whenever someone signs in or out.
useAuthStore.subscribe((state, prev) => {
  if (state.user?.uid !== prev.user?.uid) void router.invalidate();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
