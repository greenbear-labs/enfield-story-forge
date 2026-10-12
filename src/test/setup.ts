import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom doesn't implement scrolling; the router calls it on navigation.
window.scrollTo = () => {};
