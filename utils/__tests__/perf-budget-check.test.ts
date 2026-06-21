import * as Sentry from "@sentry/react-native";

import { classifyBudget, reportBudgetBreach, type BreachLevel } from "../perf-budget-check";
import { COLD_START_TTI_BUDGET } from "~/constants/perf-budgets";

const addBreadcrumbSpy = jest.spyOn(Sentry, "addBreadcrumb").mockImplementation(() => undefined);

describe("utils/perf-budget-check (issue #733)", () => {
  beforeEach(() => {
    addBreadcrumbSpy.mockClear();
  });

  describe("classifyBudget (pure)", () => {
    it("marks a value under p50 as ok with no breach", () => {
      const result = classifyBudget("coldStartTti", COLD_START_TTI_BUDGET.p50 - 1);
      expect(result.breach).toBeNull();
      expect(result.ok).toBe(true);
      expect(result.budget).toBe(COLD_START_TTI_BUDGET);
    });

    it("classifies a value between p50 and p95 as a p50 breach", () => {
      const mid = Math.round((COLD_START_TTI_BUDGET.p50 + COLD_START_TTI_BUDGET.p95) / 2);
      const result = classifyBudget("coldStartTti", mid);
      expect(result.breach).toBe("p50");
      expect(result.ok).toBe(false);
    });

    it("classifies a value above p95 as a p95 breach (tail)", () => {
      const result = classifyBudget("coldStartTti", COLD_START_TTI_BUDGET.p95 + 1);
      expect(result.breach).toBe("p95");
      expect(result.ok).toBe(false);
    });

    it("treats the exact p50 boundary as ok (<=)", () => {
      const result = classifyBudget("coldStartTti", COLD_START_TTI_BUDGET.p50);
      expect(result.breach).toBeNull();
    });

    it("treats the exact p95 boundary as a p50 breach (not p95)", () => {
      // p95 breach is strictly greater than p95; at exactly p95 it is a p50 breach.
      const result = classifyBudget("coldStartTti", COLD_START_TTI_BUDGET.p95);
      expect(result.breach).toBe("p50");
    });
  });

  describe("reportBudgetBreach (Sentry sink)", () => {
    it("does not emit a breadcrumb when within budget", () => {
      reportBudgetBreach("coldStartTti", COLD_START_TTI_BUDGET.p50 - 1);
      expect(addBreadcrumbSpy).not.toHaveBeenCalled();
    });

    it("emits an info breadcrumb on a p50 breach", () => {
      const mid = Math.round((COLD_START_TTI_BUDGET.p50 + COLD_START_TTI_BUDGET.p95) / 2);
      reportBudgetBreach("coldStartTti", mid);
      expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
      const crumb = addBreadcrumbSpy.mock.calls[0]![0];
      expect(crumb.category).toBe("perf-budget");
      expect(crumb.level).toBe("info");
      expect(crumb.message).toContain("p50 budget breached");
      expect(crumb.data).toMatchObject({
        metric: "cold-start TTI",
        breach: "p50",
        recordedMs: mid,
      });
    });

    it("emits a warning breadcrumb on a p95 breach and includes goal when set", () => {
      reportBudgetBreach("coldStartTti", COLD_START_TTI_BUDGET.p95 + 500);
      expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
      const crumb = addBreadcrumbSpy.mock.calls[0]![0];
      expect(crumb.level).toBe("warning");
      expect(crumb.message).toContain("p95 budget breached");
      expect(crumb.data).toHaveProperty("goal");
    });

    it("returns the classification so callers need not re-derive it", () => {
      const result = reportBudgetBreach("coldStartTti", COLD_START_TTI_BUDGET.p95 + 1);
      expect(result.breach).toBe("p95");
      const okResult = reportBudgetBreach("coldStartTti", 1);
      expect(okResult.breach).toBeNull();
    });

    it("never throws when Sentry.addBreadcrumb throws (launch-safe)", () => {
      addBreadcrumbSpy.mockImplementationOnce(() => {
        throw new Error("sentry down");
      });
      expect(() => reportBudgetBreach("coldStartTti", COLD_START_TTI_BUDGET.p95 + 1)).not.toThrow();
    });
  });

  describe("BreachLevel type surface", () => {
    it("the BreachLevel union includes both percentile levels and null", () => {
      const levels: BreachLevel[] = ["p50", "p95", null];
      expect(levels).toHaveLength(3);
    });
  });
});
