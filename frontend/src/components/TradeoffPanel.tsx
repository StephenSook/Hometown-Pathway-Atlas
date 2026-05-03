/**
 * TradeoffPanel — collapsible tradeoff narrative below AnalogList.
 * Anatomy per DESIGN_SYSTEM §4.12.
 *
 * Conditional phrasing required in narrative (verified by lib/mocks.ts copy
 * + auditor enforcement at backend integration time Day 4+).
 */

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface TradeoffPanelProps {
  explanation: string;
  className?: string;
}

// Co-located duration so the chevron CSS transition + Framer height
// collapse stay in sync. If this changes, both surfaces update together.
const COLLAPSE_DURATION_S = 0.3;
const COLLAPSE_EASE = [0.16, 1, 0.3, 1] as const;

export default function TradeoffPanel({
  explanation,
  className,
}: TradeoffPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      aria-label="Why these three peers"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left focus-ring rounded-2xl hover:bg-warm-neutral/40 transition-colors"
      >
        <span className="font-sans text-body font-medium text-navy">
          Why these three
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-5 w-5 text-muted-text',
            isOpen && 'rotate-180',
          )}
          style={{
            transition: reduceMotion
              ? 'none'
              : `transform ${COLLAPSE_DURATION_S}s cubic-bezier(${COLLAPSE_EASE.join(',')})`,
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            role="region"
            aria-label="Tradeoff narrative"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: COLLAPSE_DURATION_S, ease: COLLAPSE_EASE }
            }
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-1">
              <p className="font-serif text-body-lg text-body-text leading-relaxed">
                {explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function TradeoffPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading tradeoff narrative"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-4 animate-pulse',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-32 rounded bg-soft-border" />
        <div className="h-5 w-5 rounded bg-soft-border" />
      </div>
    </div>
  );
}
