/**
 * ZipInput — pill input + clay submit. Validates 5-digit US ZIP on submit.
 * Anatomy per DESIGN_SYSTEM §4.1.
 */

import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ZipInputProps {
  onSubmit: (zip: string) => void;
  loading?: boolean;
  className?: string;
}

const ZIP_PATTERN = /^\d{5}$/;

export default function ZipInput({ onSubmit, loading = false, className }: ZipInputProps) {
  const [zip, setZip] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const helperId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    if (!ZIP_PATTERN.test(zip)) {
      setError('Enter a valid 5-digit ZIP code.');
      return;
    }
    setError(null);
    onSubmit(zip);
  };

  const isInvalid = error !== null;
  // Valid-state cue: when the user has typed exactly 5 digits, the
  // submit button briefly shifts color from navy → olympic-blue +
  // scales 1.02 so the affordance reads as "ready to fire". Pure
  // CSS via Tailwind transitions; no JS animation. Disabled state
  // (loading) overrides the cue so submit-in-flight doesn't double-up
  // visual weight.
  const isReady = ZIP_PATTERN.test(zip) && !loading;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('w-full max-w-xl mx-auto', className)}
      noValidate
    >
      <label htmlFor={inputId} className="sr-only">
        Enter your 5-digit ZIP code
      </label>

      <div
        className={cn(
          'flex items-center gap-2 rounded-full bg-card-white pl-6 pr-2 py-2 transition-colors',
          'border',
          isInvalid
            ? 'border-status-danger focus-within:border-status-danger focus-within:ring-2 focus-within:ring-status-danger/15'
            : 'border-soft-border focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/15',
        )}
      >
        <input
          id={inputId}
          aria-describedby={helperId}
          aria-invalid={isInvalid}
          autoComplete="postal-code"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          placeholder="Enter your 5-digit ZIP"
          value={zip}
          onChange={(event) => {
            // Strip non-digits as user types, max 5
            const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
            setZip(digits);
            if (error) setError(null);
          }}
          disabled={loading}
          className="flex-1 bg-transparent text-body text-body-text placeholder:text-muted-text outline-none disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={loading}
          // bg-navy + white passes WCAG AA AAA on body text. The previous
          // bg-paralympic-clay + white was 3.94:1 (fail AA, axe-core caught
          // 2026-05-02) AND violated DESIGN_SYSTEM §1.1's clay-only-on-
          // ≥24px-text rule. Navy is unrestricted.
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-body text-card-white font-medium',
            'transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-ring',
            isReady
              ? 'bg-olympic-blue scale-[1.03] shadow-md hover:bg-olympic-blue'
              : 'bg-navy hover:bg-navy/90',
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Loading</span>
            </>
          ) : (
            <>
              <span>Show me</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <p
        id={helperId}
        className={cn(
          'mt-2 text-caption font-sans px-1',
          isInvalid ? 'text-status-danger' : 'text-muted-text',
        )}
      >
        {error ?? 'Enter your 5-digit ZIP'}
      </p>
    </form>
  );
}
