/**
 * Atlas — placeholder shell.
 *
 * Per DESIGN_SYSTEM.md §15 Build Order: scaffold + theme tokens only.
 * Components (ZipInput, Navbar, RegionHeader, ParityPanel, etc.) are built
 * starting Day 2 PM per §15. This shell exists only to verify Tailwind tokens,
 * Google Fonts, and dev server boot.
 */

export default function App() {
  return (
    <main className="min-h-screen bg-warm-neutral text-body-text">
      <div className="mx-auto max-w-[880px] px-6 pt-24 pb-16">
        <p className="text-eyebrow text-muted-text font-mono uppercase mb-6">
          Atlas — design system check
        </p>
        <h1 className="text-h1 font-sans font-semibold text-navy mb-4">
          Hometown Pathway <span className="font-serif italic">Atlas</span>
        </h1>
        <p className="text-body-lg text-muted-text mb-12">
          Editorial scaffold ready. Components per DESIGN_SYSTEM.md §15 build order.
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl bg-card-white border border-soft-border p-6 shadow-card-resting">
            <p className="text-eyebrow font-mono uppercase text-navy mb-3">Olympic</p>
            <p className="text-stat-lg font-sans font-bold text-navy tabular">1.83</p>
            <p className="text-caption text-muted-text mt-1">per 100k population</p>
          </div>
          <div className="rounded-2xl bg-card-white border border-soft-border p-6 shadow-card-resting">
            <p className="text-eyebrow font-mono uppercase text-paralympic-clay mb-3">
              Paralympic
            </p>
            <p className="text-stat-lg font-sans font-bold text-paralympic-clay tabular">
              0.39
            </p>
            <p className="text-caption text-muted-text mt-1">per 100k population</p>
          </div>
        </div>

        <p className="text-caption font-serif italic text-muted-text mt-8">
          Side-by-side, never merged. Per DESIGN_SYSTEM.md §4.4.
        </p>
      </div>
    </main>
  );
}
