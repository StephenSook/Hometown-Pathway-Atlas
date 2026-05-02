/**
 * Framer Motion presets — locked to DESIGN_SYSTEM.md §5.1
 *
 * Editorial data journalism motion language. NO bouncy springs, NO bombast.
 * Subtle, audit-grade, NYT-tier transitions. Respect prefers-reduced-motion globally
 * via index.css base layer (animations are disabled via @media reduce).
 */

import type { Variants, Transition } from 'framer-motion';

const ease: Transition['ease'] = [0.16, 1, 0.3, 1];

// ───── Standard entrance ─────

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease } },
};

// ───── Stagger containers ─────

export const stagger = (delayChildren = 0.05): Variants => ({
  animate: { transition: { staggerChildren: delayChildren } },
});

// Per Steal #3 — Reuters-style 50ms stagger for editorial card cascades
export const reutersStagger: Variants = stagger(0.05);

// ───── Compliance Log entries (Pillar 4 demo moment) ─────
// Per Magic 21st Dashboard Activities pattern (Steal #15)
export const complianceLogEntry: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } },
};

// "fixed" status spring — replaces "fail" entry in place
// Per Kinetic Log Stream pattern
export const fixedStatusEntry: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

// ───── Hover micro-interactions ─────

export const cardHover = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.2, ease },
};

// ───── Page transitions ─────

export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease } },
  exit: { opacity: 0, transition: { duration: 0.2, ease } },
};
