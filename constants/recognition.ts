/**
 * Recognition-layer constants for the camera ingredient-scan pipeline.
 *
 * Per the SnapChef finding [F4], the recognition layer (not the recipe LLM) is
 * the accuracy bottleneck: it produces hallucinations and missed items. To
 * surface those at scan time instead of silently committing them to the pantry,
 * classifyStaticImage now returns a per-item confidence score, and items below
 * this threshold are flagged with a `needs_review` status distinct from a hard
 * failure.
 *
 * The threshold is a named, tunable constant so it can be adjusted from real
 * accept/correct distributions without code surgery. Start conservative: a
 * threshold that fires too often becomes friction and hurts the Day-0 "aha",
 * while one set too low silently lets wrong items through.
 */
export const CONFIDENCE_REVIEW_THRESHOLD = 0.6;

/**
 * Confidence value assumed when the model returns a recognisable item but no
 * explicit confidence score, or when the JSON is malformed and we fall back to
 * the defensive comma-split parser. Low by design so missing-confidence items
 * are surfaced for review rather than trusted silently.
 */
export const DEFAULT_MISSING_CONFIDENCE = 0.3;

/**
 * Confidence value used when recognition genuinely cannot identify anything
 * (the former "unknown" collapse path). These items are always flagged.
 */
export const UNIDENTIFIABLE_CONFIDENCE = 0;
