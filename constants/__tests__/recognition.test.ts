import {
  CONFIDENCE_REVIEW_THRESHOLD,
  DEFAULT_MISSING_CONFIDENCE,
  UNIDENTIFIABLE_CONFIDENCE,
} from "../recognition";

describe("constants/recognition (threshold tuning)", () => {
  it("exposes a confidence review threshold in the valid [0,1] range", () => {
    expect(CONFIDENCE_REVIEW_THRESHOLD).toBeGreaterThan(0);
    expect(CONFIDENCE_REVIEW_THRESHOLD).toBeLessThanOrEqual(1);
  });

  it("defaults missing-confidence items to a value below the review threshold", () => {
    // So items the model failed to score are surfaced for review, not trusted.
    expect(DEFAULT_MISSING_CONFIDENCE).toBeLessThan(CONFIDENCE_REVIEW_THRESHOLD);
  });

  it("uses a zero confidence for genuinely unidentifiable items", () => {
    expect(UNIDENTIFIABLE_CONFIDENCE).toBe(0);
    expect(UNIDENTIFIABLE_CONFIDENCE).toBeLessThan(CONFIDENCE_REVIEW_THRESHOLD);
  });
});
