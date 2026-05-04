/**
 * Minimal ambient declarations for `react-scrollama` (no published
 * @types/react-scrollama exists). Covers the surface used by
 * ScrollytellingHero — Scrollama wrapper + Step component +
 * onStepEnter callback signature. If we exercise more of the API
 * later (onStepExit, onStepProgress), extend these as needed.
 *
 * Source for the surface: react-scrollama README + src/index.tsx in
 * the upstream repo (jsonkao/react-scrollama). The library's runtime
 * exports are stable since v2.0; this declaration just teaches tsc
 * to trust them.
 */

declare module 'react-scrollama' {
  import type { ComponentType, ReactNode } from 'react';

  interface ScrollamaCallbackData<T = unknown> {
    /** Whatever was passed via the Step's `data` prop. */
    data: T;
    /** Direction of scroll that triggered the callback. */
    direction: 'up' | 'down';
    /** The DOM element wrapping the Step. */
    element?: Element;
    /** Index of the step within the Scrollama children. */
    entry?: IntersectionObserverEntry;
  }

  interface ScrollamaProps {
    /** Fired when a step's center crosses the offset line. */
    onStepEnter?: (data: ScrollamaCallbackData) => void;
    /** Fired when a step exits the offset line. */
    onStepExit?: (data: ScrollamaCallbackData) => void;
    /** Fired during step progress (0-1). */
    onStepProgress?: (data: ScrollamaCallbackData & { progress: number }) => void;
    /** Where in the viewport the trigger fires (0 = top, 1 = bottom). Default 0.5. */
    offset?: number;
    /** Number of progress callbacks per step; pass false to disable. */
    threshold?: number | false;
    /** Debug overlay for the offset line. */
    debug?: boolean;
    children?: ReactNode;
  }

  interface StepProps {
    /** Arbitrary data passed back to onStepEnter / onStepExit callbacks. */
    data?: unknown;
    children?: ReactNode;
  }

  export const Scrollama: ComponentType<ScrollamaProps>;
  export const Step: ComponentType<StepProps>;
}
