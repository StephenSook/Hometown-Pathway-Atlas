/**
 * Atlas — root app shell.
 * Skip-to-content link first per DESIGN_SYSTEM §8 keyboard nav requirement.
 */

import HomePage from './pages/HomePage';

export default function App() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-card-white focus:no-underline"
      >
        Skip to main content
      </a>
      <HomePage />
    </>
  );
}
