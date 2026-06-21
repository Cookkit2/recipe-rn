/**
 * Cold-start / Time-to-Interactive performance budgets (issue #733).
 *
 * These are named, documented thresholds used by the budget-check utility
 * (`utils/perf-budget-check.ts`) to surface a regression signal (a Sentry
 * breadcrumb) when a recorded cold-start metric degrades beyond budget.
 *
 * Values are informed by the issue's research framing and the app's
 * pantry-first home screen (app/index.tsx -> PantryWrapper renders a stock
 * list from WatermelonDB). They are intentionally STARTING budgets — the
 * issue calls for validating them against a real Observe capture on a cold
 * install and tightening them over time. Treat these as warn-level guardrails,
 * not hard CI gates (see Risks in issue #733).
 *
 * All values are in milliseconds.
 */

/**
 * Individual named budget. `p50`/`p95` are the primary guardrails; `goal` is
 * the aspirational target the team is driving toward (informational only, not
 * used for breach signaling).
 */
export interface PerfBudget {
  /** Human-readable label, e.g. "cold-start TTI". */
  label: string;
  /** Median (p50) threshold in ms. Breach signals a regression. */
  p50: number;
  /** Tail (p95) threshold in ms. Breach signals a regression. */
  p95: number;
  /** Aspirational target in ms (informational; not enforced). */
  goal?: number;
  /** Why this metric matters / what it measures. */
  description: string;
}

/**
 * Cold-start Time-to-Interactive: launch -> first point at which the home
 * screen (pantry) is responsive to user input. This is the single
 * highest-leverage metric for Day-0 retention on a pantry-first app.
 */
export const COLD_START_TTI_BUDGET: PerfBudget = {
  label: "cold-start TTI",
  p50: 2_000,
  p95: 3_500,
  goal: 1_500,
  description:
    "Launch to first interactive home screen (pantry tappable). Gates Day-0 aha; validate against Observe capture.",
};

/**
 * First paint / first-contentful paint: the first pixels the user sees.
 * Kept well under TTI so the launch does not feel frozen.
 */
export const FIRST_PAINT_BUDGET: PerfBudget = {
  label: "first paint",
  p50: 1_000,
  p95: 1_800,
  goal: 800,
  description: "Launch to first contentful paint on the home screen. Should feel instant.",
};

/**
 * WatermelonDB open time: adapter + Database construction through to ready.
 * With the lazy singleton (issue #733) this is shifted off the synchronous
 * import path and warmed on idle; the budget guards the warm-up cost.
 */
export const DB_OPEN_BUDGET: PerfBudget = {
  label: "DB open",
  p50: 400,
  p95: 900,
  goal: 300,
  description:
    "SQLiteAdapter + Database construction to ready. Now lazy; warmed via requestIdleCallback after first paint.",
};

/** Aggregate of all named budgets, for budget-check iteration. */
export const PERF_BUDGETS = {
  coldStartTti: COLD_START_TTI_BUDGET,
  firstPaint: FIRST_PAINT_BUDGET,
  dbOpen: DB_OPEN_BUDGET,
} as const;

export type PerfBudgetKey = keyof typeof PERF_BUDGETS;
