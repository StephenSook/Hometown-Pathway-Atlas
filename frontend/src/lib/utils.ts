import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Custom twMerge instance teaching the merger about our project's custom
 * font-size tokens (text-stat-md, text-stat-lg, text-h1, text-h2, text-h3,
 * text-eyebrow, text-caption, text-body, text-body-lg). Without this,
 * twMerge sees `text-stat-md` and `text-olympic-blue` as colliding text-*
 * utilities and drops the size — which silently broke ParityPanel's stat
 * sizing on mobile (axe-core caught: rendered 16px instead of 28px,
 * pushed olympic-blue + paralympic-clay text below WCAG AA at small size).
 *
 * Caught 2026-05-02 mobile a11y sweep.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'stat-md',
            'stat-lg',
            'h1',
            'h2',
            'h3',
            'eyebrow',
            'caption',
            'body',
            'body-lg',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
