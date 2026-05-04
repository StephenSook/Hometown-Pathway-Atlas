/**
 * CountyNameSearch — fuzzy county-name combobox sibling of ZipInput.
 *
 * Use case: judges who don't know specific ZIPs (or who want to test
 * a particular county by name) can type "Cobb" → see Cobb County, GA →
 * click → drill-down via /api/region/by-fips/{fips}. Same backend
 * pathway map-click drill-down already uses; HomePage handleSelectCounty
 * is the unified entry point.
 *
 * UX:
 * - Empty query → no results visible (collapsed)
 * - Non-empty → up to 8 ranked matches in a small dropdown
 * - Click result → fires onSelect(fips), parent navigates
 * - Dropdown collapses on outside click (mousedown global listener)
 *
 * A11y: input has explicit label association via htmlFor + id. Result
 * list uses role=listbox + aria-activedescendant for screen-reader
 * navigation. Esc closes the dropdown.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import {
  formatCountyLabel,
  searchCounties,
  type CountyEntry,
} from '../lib/countyLookup';
import { cn } from '../lib/utils';

interface CountyNameSearchProps {
  onSelect: (fips: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function CountyNameSearch({
  onSelect,
  disabled,
  className,
}: CountyNameSearchProps) {
  const inputId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo<CountyEntry[]>(() => searchCounties(query, 8), [query]);

  // Close dropdown on outside click. Mousedown (not click) avoids the
  // race where a click on a result fires AFTER the input blurs.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset active index when results shape changes
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  const selectEntry = (entry: CountyEntry) => {
    onSelect(entry.fips);
    setQuery('');
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
      setOpen(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) selectEntry(target);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length > 0 && results.length > 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <label
        htmlFor={inputId}
        className="block font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2 text-center"
      >
        Or search by county name
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-text pointer-events-none"
        />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown ? `${listboxId}-${activeIndex}` : undefined
          }
          placeholder='e.g. "Cobb" or "Mecklenburg"'
          className="w-full rounded-xl border border-soft-border bg-card-white pl-10 pr-4 py-3 font-sans text-body text-body-text placeholder:text-muted-text/70 focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 w-full rounded-xl bg-card-white border border-soft-border shadow-md overflow-hidden"
        >
          {results.map((entry, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                id={`${listboxId}-${i}`}
                key={entry.fips}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectEntry(entry)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 font-sans text-body transition-colors flex items-baseline justify-between gap-3',
                    isActive ? 'bg-warm-neutral text-navy' : 'text-body-text hover:bg-warm-neutral',
                  )}
                >
                  <span>{formatCountyLabel(entry)}</span>
                  <span className="font-mono text-eyebrow text-muted-text shrink-0">
                    {entry.fips}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
