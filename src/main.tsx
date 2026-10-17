import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from './app/router';
import { initAuth, useAuthStore } from './features/auth/authStore';
import { watchConnectivity } from './lib/firestore/sync';
import './styles/index.css';

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
