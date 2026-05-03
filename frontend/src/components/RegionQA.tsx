/**
 * RegionQA — Layer C ★ Multimodal region Q&A panel.
 *
 * Per CLAUDE.md Maximum Scope Addendum Layer C: highest-tier "Gemini in
 * new ways" judge play. User asks a natural-language question about the
 * current region; Gemini reasons over visible region context (FIPS,
 * metrics, sport mix, climate) and answers in conditional, evidence-
 * grounded prose. Visible "thinking" reasoning chain parallels the
 * ComplianceLog audit-stream pattern but at core UX layer rather than
 * compliance instrumentation.
 *
 * Backend dependency: Vinh task 2.7 (GeminiService) — POST
 * /api/region/qa with body {fips, question}. Currently stubbed (see
 * STUBBED_RESPONSE below) so the panel renders demo-ready RIGHT NOW.
 * When Vinh ships the backend endpoint, swap STUBBED_RESPONSE for the
 * real api.regionQA(fips, question) call (one-line change at the
 * marked integration point) — no UI rewiring.
 *
 * Conditional phrasing rule: every reasoning step + final answer must
 * pass through Atlas's banned-verb regex. STUBBED_RESPONSE fixtures are
 * hand-authored to comply; real backend response will pass through
 * HybridAuditor (task 2.9) before reaching this component.
 *
 * A11y:
 *   - <article role="region"> landmark mirroring sibling Pillar5
 *     and ComplianceLog conventions
 *   - Question input: <label> tied to <textarea> via id+htmlFor
 *   - Reasoning steps: <ol role="list"> for sequential AT readout
 *   - Final answer: aria-live="polite" so screen readers hear it
 *     when it lands
 *   - Asking state: aria-busy="true" + spinner visible to sighted
 *
 * Cut posture: per CLAUDE.md cut trigger "if Gemini Live integration
 * is fighting us at end of Day 6, cut and ship without it." This
 * component renders demo-ready via stub — if you decide to cut Layer C
 * cleanly, just remove the <RegionQA /> render in HomePage and this
 * file. No other components depend on it.
 */

import { useId, useRef, useState } from 'react';
import { Brain, Loader2, Send } from 'lucide-react';
import type { RegionResponse } from '../lib/api';
import { cn } from '../lib/utils';

interface RegionQAProps {
  region: RegionResponse;
  className?: string;
}

interface ReasoningStep {
  /** Short label for the step (e.g. "Pulling parity metrics"). */
  step: string;
  /** Detail line shown below the step label. */
  detail: string;
}

interface QAResponse {
  reasoning: ReasoningStep[];
  answer: string;
  confidence: 'high' | 'medium' | 'low';
}

// STUBBED_RESPONSE — replace with `await api.regionQA(region.fips, question)`
// when Vinh ships task 2.7 (GeminiService) + the new POST /api/region/qa
// endpoint. The shape here matches what the backend response will look
// like: ordered reasoning steps + final conditional-phrased answer +
// confidence tier. Hand-authored to satisfy conditional-phrasing CI.
const STUBBED_RESPONSE: QAResponse = {
  reasoning: [
    {
      step: 'Pulling region parity metrics',
      detail:
        'Olympic + Paralympic per-100k from this region as base context.',
    },
    {
      step: 'Cross-referencing top sports',
      detail:
        'Per-sport over-indexing pattern from NFHS + Team USA roster join.',
    },
    {
      step: 'Reasoning over climate signature',
      detail:
        'Köppen-Geiger zone match against the region pattern set.',
    },
    {
      step: 'Drafting conditional-phrased response',
      detail:
        'Hedged claims only; banned causal verbs caught at draft + audit.',
    },
  ],
  answer:
    "This region's representation patterns could be associated with a combination of climate signature and historical participation density in the over-indexed sports listed above. The Olympic and Paralympic counts shown (each ranked separately by per-capita percentile) may correlate with regional pathway depth — though hometown listings reflect what's recognized in our indexed sources, not full athlete origin stories.",
  confidence: 'medium',
};

// Pre-canned suggested questions to lower judge friction. Picking one
// auto-fills the textarea. Same questions work for any region thanks to
// region-agnostic phrasing.
const SUGGESTED_QUESTIONS = [
  'Why might this region produce these particular sports?', // atlas-phrasing-allow — quoted natural-language input
  'What signals could explain the Olympic vs Paralympic gap here?',
  'How does this region compare to its analog peers?',
] as const;

export default function RegionQA({ region, className }: RegionQAProps) {
  const headingId = useId();
  const inputId = useId();
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [asking, setAsking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    setResponse(null);

    // ───────── BACKEND INTEGRATION POINT ─────────
    // Replace the simulated delay + STUBBED_RESPONSE below with:
    //   const result = await api.regionQA(region.fips, question.trim());
    //   setResponse(result);
    // When task 2.7 ships, also wire ApiError → toast.error path
    // (QueryCache.onError doesn't cover non-React-Query fetches).
    await new Promise((resolve) => setTimeout(resolve, 1800));
    setResponse(STUBBED_RESPONSE);
    setAsking(false);
  };

  const handleSuggestionClick = (q: string) => {
    setQuestion(q);
    textareaRef.current?.focus();
  };

  return (
    <article
      role="region"
      aria-labelledby={headingId}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-sm p-6',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p
            id={headingId}
            className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-1"
          >
            Ask the Atlas — Gemini region Q&A
          </p>
          <p className="font-serif italic text-caption text-muted-text">
            Reasons over the visible region context. Conditional-phrased
            answer + visible reasoning chain.
          </p>
        </div>
        <Brain
          className="h-5 w-5 text-olympic-blue shrink-0 mt-1"
          aria-hidden="true"
        />
      </header>

      <form onSubmit={handleSubmit} className="mb-4">
        <label
          htmlFor={inputId}
          className="block font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2"
        >
          Question
        </label>
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            id={inputId}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={asking}
            rows={2}
            placeholder={`e.g. "Why might ${region.county_name} show this Olympic vs Paralympic balance?"`}
            className="flex-1 rounded-xl border border-soft-border bg-warm-neutral px-4 py-3 font-sans text-body text-body-text placeholder:text-muted-text/70 focus-ring resize-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!question.trim() || asking}
            aria-label="Ask region question"
            className="self-start rounded-xl bg-navy text-card-white px-4 py-3 font-mono uppercase tracking-wider text-eyebrow shrink-0 hover:bg-olympic-blue focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {asking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>

      <div className="mb-6">
        <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2">
          Sample questions
        </p>
        <ul className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => handleSuggestionClick(q)}
                disabled={asking}
                className="inline-flex items-center rounded-full border border-soft-border bg-warm-neutral px-3 py-1.5 text-caption text-body-text hover:border-navy hover:text-navy focus-ring transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {(asking || response) && (
        <div
          aria-busy={asking}
          className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 border-t border-soft-border pt-6"
        >
          <section
            aria-label="Gemini reasoning chain"
            className="md:border-r md:border-soft-border md:pr-6"
          >
            <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3">
              Reasoning
            </p>
            <ol role="list" className="flex flex-col gap-3">
              {(response?.reasoning ?? STUBBED_RESPONSE.reasoning).map(
                (step, i) => {
                  const visible = response !== null || i < 1;
                  return (
                    <li
                      key={step.step}
                      className={cn(
                        'flex flex-col gap-1 transition-opacity duration-300',
                        visible ? 'opacity-100' : 'opacity-30',
                      )}
                    >
                      <p className="font-sans font-semibold text-caption text-navy">
                        {i + 1}. {step.step}
                      </p>
                      <p className="font-serif italic text-caption text-muted-text leading-snug">
                        {step.detail}
                      </p>
                    </li>
                  );
                },
              )}
            </ol>
          </section>

          <section aria-labelledby={`${headingId}-answer`} aria-live="polite">
            <p
              id={`${headingId}-answer`}
              className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3"
            >
              Answer
            </p>
            {response ? (
              <>
                <p className="font-sans text-body text-body-text leading-relaxed mb-4">
                  {response.answer}
                </p>
                <p className="font-mono text-eyebrow text-muted-text">
                  Confidence: {response.confidence}
                </p>
              </>
            ) : (
              // Layout-preserving skeleton — matches the shape of the
              // eventual answer paragraph + confidence pill so the
              // response area doesn't pop in / reflow when data lands.
              // Mirrors the animate-pulse pattern from ResultsSkeleton
              // siblings.
              <div aria-label="Generating response" className="animate-pulse">
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full rounded bg-soft-border" />
                  <div className="h-4 w-[92%] rounded bg-soft-border" />
                  <div className="h-4 w-[78%] rounded bg-soft-border" />
                  <div className="h-4 w-[85%] rounded bg-soft-border" />
                </div>
                <div className="h-3 w-32 rounded bg-soft-border/60" />
              </div>
            )}
          </section>
        </div>
      )}

      <p className="mt-6 font-serif italic text-eyebrow text-muted-text leading-relaxed">
        Region Q&A currently uses a fixed demonstration response; live
        responses will pass through the same audit checks before display.
      </p>
    </article>
  );
}
