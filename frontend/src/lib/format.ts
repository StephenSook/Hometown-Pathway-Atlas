/**
 * Formatting helpers — used across stat displays.
 * Locked to DESIGN_SYSTEM.md §1.2 typography (tabular variants for numbers).
 */

const numberFmt = new Intl.NumberFormat('en-US');

export function fmtPopulation(value: number): string {
  return numberFmt.format(value);
}

export function fmtPerCapita(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function fmtPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function fmtPercentile(value: number): string {
  // Percentiles are 0–100; one decimal max for editorial precision
  return fmtPercent(value, 1);
}

export function fmtZScore(value: number): string {
  // Z-scores show sign + 1 decimal: "+2.1" / "-0.3"
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function fmtTimestamp(iso: string): string {
  // ComplianceLog uses ISO8601, render as HH:MM:SS in monospace context
  const d = new Date(iso);
  return d.toISOString().slice(11, 19);
}

/**
 * Per DESIGN_SYSTEM.md §4.4 — evidence label always paired with text + icon,
 * never color-only (WCAG 1.4.1 compliance).
 */
export function evidenceLabel(level: 'high' | 'medium' | 'low'): string {
  return `evidence: ${level}`;
}
