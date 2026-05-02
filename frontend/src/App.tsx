/**
 * Atlas — root app shell.
 *
 * Renders pages/HomePage as landing surface.
 * react-router-dom routing for /region/{fips} drilldowns added Day 3+
 * when backend integration begins.
 */

import HomePage from './pages/HomePage';

export default function App() {
  return <HomePage />;
}
