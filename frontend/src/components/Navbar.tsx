/**
 * Navbar — floating pill nav per DESIGN_SYSTEM.md §4.2
 *
 * - Fixed top, centered, max-w-5xl
 * - Left: "Atlas" wordmark in Instrument Serif italic, navy
 * - Center (desktop): JetBrains Mono uppercase nav links, 0.2em letter-spacing
 * - Right: small accent button, navy bg
 * - Mobile (<md): logo + hamburger only, expanded drop on toggle
 * - Scroll: shadow-sm → shadow-md when scrollY > 100
 *
 * Reference: docs/moodboard/01_hero.png (top)
 * Production nav links per DESIGN_SYSTEM §14: Region · Methodology · About
 * (NOT "EXPLORE METHOD ABOUT" — moodboard placeholder text)
 */

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavLink {
  label: string;
  href: string;
}

// Methodology routes via #about — HomePage hash listener watches for
// '#about' and swaps view to MethodologyPage. Previously had a separate
// 'Methodology' entry pointing at the dead '#methodology' anchor (no
// element with that id exists + handler doesn't watch it). Collapsed to
// one entry so both labels can't disagree about destination.
const NAV_LINKS: NavLink[] = [
  { label: 'Region', href: '#region' },
  { label: 'Methodology', href: '#about' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>(
    typeof window !== 'undefined' ? window.location.hash || '#top' : '#top',
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    const handleHashChange = () => setActiveHash(window.location.hash || '#top');
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // ESC closes mobile menu (a11y per §8.2 keyboard nav)
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="fixed top-4 inset-x-4 z-40 flex justify-center pointer-events-none"
    >
      <div
        className={cn(
          'pointer-events-auto inline-flex items-center justify-between gap-4 sm:gap-8',
          'rounded-full bg-card-white border border-soft-border',
          'px-6 py-3 max-w-5xl w-full md:w-auto transition-shadow duration-200',
          isScrolled ? 'shadow-card-hover' : 'shadow-nav-pill',
        )}
      >
        {/* Wordmark */}
        <a
          href="#top"
          className="font-serif italic text-h3 text-navy leading-none focus-ring rounded"
          aria-label="Atlas — home"
        >
          Atlas
        </a>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = activeHash === link.href;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'text-eyebrow font-mono uppercase transition-colors focus-ring rounded',
                    isActive ? 'text-navy' : 'text-muted-text hover:text-navy',
                  )}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <a
            href="#region"
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-navy px-4 py-1.5 text-eyebrow font-mono uppercase text-card-white hover:bg-navy/90 transition-colors focus-ring"
          >
            Find region
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-navy hover:bg-warm-neutral transition-colors focus-ring"
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drop */}
      {isMobileOpen && (
        <div
          id="mobile-menu"
          className="absolute top-full mt-2 left-4 right-4 pointer-events-auto md:hidden"
        >
          <div className="rounded-2xl bg-card-white border border-soft-border shadow-card-hover p-4">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="block px-3 py-2 rounded-lg text-body font-mono uppercase tracking-wider text-muted-text hover:text-navy hover:bg-warm-neutral transition-colors focus-ring"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#region"
                  onClick={() => setIsMobileOpen(false)}
                  className="block px-3 py-2 mt-2 rounded-lg bg-navy text-card-white text-body font-mono uppercase tracking-wider hover:bg-navy/90 transition-colors focus-ring"
                >
                  Find region
                </a>
              </li>
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
