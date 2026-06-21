import {
  COLD_START_TTI_BUDGET,
  FIRST_PAINT_BUDGET,
  DB_OPEN_BUDGET,
  PERF_BUDGETS,
} from "../perf-budgets";

describe("constants/perf-budgets (issue #733)", () => {
  it("exposes the three named budgets required by the issue", () => {
    expect(COLD_START_TTI_BUDGET.label).toBe("cold-start TTI");
    expect(FIRST_PAINT_BUDGET.label).toBe("first paint");
    expect(DB_OPEN_BUDGET.label).toBe("DB open");
  });

  it("each budget defines p50 and p95 thresholds in ms", () => {
    for (const budget of [COLD_START_TTI_BUDGET, FIRST_PAINT_BUDGET, DB_OPEN_BUDGET]) {
      expect(typeof budget.p50).toBe("number");
      expect(typeof budget.p95).toBe("number");
      expect(budget.p50).toBeGreaterThan(0);
      // p95 is the tail and must be looser than p50.
      expect(budget.p95).toBeGreaterThan(budget.p50);
      expect(budget.description.length).toBeGreaterThan(0);
    }
  });

  it("first paint is budgeted tighter than cold-start TTI", () => {
    // First pixels must appear before the screen is interactive.
    expect(FIRST_PAINT_BUDGET.p50).toBeLessThan(COLD_START_TTI_BUDGET.p50);
  });

  it("PERF_BUDGETS aggregates every named budget under stable keys", () => {
    expect(PERF_BUDGETS.coldStartTti).toBe(COLD_START_TTI_BUDGET);
    expect(PERF_BUDGETS.firstPaint).toBe(FIRST_PAINT_BUDGET);
    expect(PERF_BUDGETS.dbOpen).toBe(DB_OPEN_BUDGET);
    expect(Object.keys(PERF_BUDGETS).sort()).toEqual(["coldStartTti", "dbOpen", "firstPaint"]);
  });
});
