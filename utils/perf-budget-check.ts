/**
 * Cold-start budget-check utility (issue #733).
 *
 * Compares a recorded cold-start metric against the named budgets in
 * `constants/perf-budgets.ts` and surfaces a regression signal — a Sentry
 * breadcrumb — when the recorded value breaches its p50 or p95 budget. This
 * is the warn-level defensive measure called for in the issue: it lets a
 * launch regression be seen in Sentry before release without hard-blocking
 * unrelated PRs.
 *
 * Design constraints (mirroring lib/analytics/funnel-events.ts):
 *  - Pure helpers are exported separately so the Jest suite can assert
 *    classification without touching Sentry.
 *  - The sink (Sentry.addBreadcrumb) is wrapped in try/catch so a throwing
 *    Sentry call can never break the surrounding boot/init path.
 */

import * as Sentry from "@sentry/react-native";
import { PERF_BUDGETS, type PerfBudget, type PerfBudgetKey } from "~/constants/perf-budgets";

/** Which percentile threshold was breached, if any. */
export type BreachLevel = "p50" | "p95" | null;

export interface BudgetCheckResult {
  /** The budget that was evaluated. */
  budget: PerfBudget;
  /** Whether/where the recorded value breached the budget. */
  breach: BreachLevel;
  /** The recorded value, in ms. */
  recordedMs: number;
  /** True when `recordedMs` is within both p50 and p95. */
  ok: boolean;
}

/**
 * Classify a recorded metric against a named budget. Pure — no side effects.
 * Returns the breach level (p95 worse than p50) and whether the value is ok.
 * A value <= p50 is ok; a value in (p50, p95] is a p50 breach; a value >
 * p95 is a p95 breach.
 */
export function classifyBudget(key: PerfBudgetKey, recordedMs: number): BudgetCheckResult {
  const budget = PERF_BUDGETS[key];
  let breach: BreachLevel = null;
  if (recordedMs > budget.p95) {
    breach = "p95";
  } else if (recordedMs > budget.p50) {
    breach = "p50";
  }
  return { budget, breach, recordedMs, ok: breach === null };
}

/**
 * Evaluate a recorded metric and, on breach, emit a Sentry breadcrumb as the
 * warn-level regression signal. No-op (returns ok) when within budget.
 *
 * Safe to call from the launch path: any Sentry failure is swallowed so it
 * can never break app boot. Returns the classification so callers/tests can
 * assert behaviour without depending on Sentry.
 */
export function reportBudgetBreach(key: PerfBudgetKey, recordedMs: number): BudgetCheckResult {
  const result = classifyBudget(key, recordedMs);
  if (result.breach === null) return result;

  const { budget, breach } = result;
  try {
    Sentry.addBreadcrumb({
      category: "perf-budget",
      type: "default",
      level: breach === "p95" ? "warning" : "info",
      message: `${budget.label} ${breach} budget breached`,
      data: {
        metric: budget.label,
        breach,
        recordedMs,
        p50Budget: budget.p50,
        p95Budget: budget.p95,
        ...(budget.goal !== undefined ? { goal: budget.goal } : {}),
      },
    });
  } catch {
    /* a throwing Sentry call must never break the surrounding boot path */
  }

  return result;
}
