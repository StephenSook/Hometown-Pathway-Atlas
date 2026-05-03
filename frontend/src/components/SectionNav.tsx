/**
 * SectionNav — sticky in-page jump-to navigation for the results view.
 *
 * Long results page (Region → Map → Parity → Analogs → Q&A → Pillar 5).
 * Judges should be able to skip to any section without scrolling. This
 * is the floating right-edge mini-nav that surfaces section anchors as
 * vertical pills.
 *
 * Desktop only (md+) — mobile layout is already tight + uses single-
 * column scroll, the nav would compete with content.
 *
 * Active section highlighting via IntersectionObserver on each
 * section's anchor id. Threshold tuned so the active state changes when
 * a section's TOP crosses past the nav's vertical midpoint.
 *
 * Click handler uses scrollIntoView({behavior: 'smooth'}) — respects
 * prefers-reduced-motion (browser auto-converts smooth → instant when
 * user has reduced motion set).
 *
 * A11y: <nav role="navigation" aria-label="Page sections">. Each chip
 * is a real <a href="#id"> so keyboard users can Tab through them and
 * the URL-fragment behavior matches user expectation.
 */

import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionNavItem[];
  className?: string;
}

export default function SectionNav({ sections, className }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's still
        // intersecting. Multiple sections can intersect simultaneously
        // when the viewport is tall; the one whose TOP is highest (most
        // negative if above, smallest positive if below) wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0 && visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      // rootMargin pulls the observer's bounds inward from the top
      // (-30% from top) so a section becomes "active" only after its
      // top has scrolled past 30% of the viewport — not the moment it
      // enters at the bottom.
      { rootMargin: '-30% 0px -50% 0px', threshold: 0 },
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      role="navigation"
      aria-label="Page sections"
      className={cn(
        // hidden mobile, sticky-ish floating right edge desktop
        'hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-20',
        'flex-col gap-1.5',
        className,
      )}
    >
      {sections.map(({ id, label }) => {
        const isActive = id === activeId;
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'group inline-flex items-center justify-end gap-2 rounded-full',
              'pr-3 pl-2 py-1.5 transition-colors focus-ring',
              isActive
                ? 'text-navy'
                : 'text-muted-text hover:text-navy',
            )}
          >
            <span
              className={cn(
                'font-mono uppercase tracking-wider text-eyebrow leading-none transition-opacity',
                isActive
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
            >
              {label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                isActive
                  ? 'bg-navy scale-100'
                  : 'bg-muted-text/40 scale-75 group-hover:bg-navy group-hover:scale-100',
              )}
            />
          </a>
        );
      })}
    </nav>
  );
}
