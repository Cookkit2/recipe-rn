// Mock the supabase API + native modules so importing CreateIngredientContext
// does not pull the untransformed mmkv/supabase ESM chain into the Jest runtime.
// We only unit-test the pure statusForConfidence threshold logic.
jest.mock("~/data/supabase-api/BaseIngredientApi", () => ({
  baseIngredientApi: { getBaseIngredientByName: jest.fn() },
}));
jest.mock("expo-file-system", () => ({ File: jest.fn(), Paths: { cache: "" } }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { statusForConfidence, type ProcessingStatus } from "../CreateIngredientContext";

describe("statusForConfidence (threshold logic)", () => {
  it("returns undefined for high-confidence recognitions (current behavior preserved)", () => {
    expect(statusForConfidence(0.9)).toBeUndefined();
    expect(statusForConfidence(1)).toBeUndefined();
  });

  it("returns 'needs_review' for low-confidence recognitions", () => {
    expect(statusForConfidence(0.1)).toBe<ProcessingStatus>("needs_review");
    expect(statusForConfidence(0)).toBe<ProcessingStatus>("needs_review");
  });

  it("treats the boundary at the threshold as a pass (not needs_review)", () => {
    // confidence == threshold clears status (boundary inclusive on the high side)
    expect(statusForConfidence(0.6, 0.6)).toBeUndefined();
  });

  it("flags items just below the threshold for review", () => {
    expect(statusForConfidence(0.59, 0.6)).toBe<ProcessingStatus>("needs_review");
  });

  it("passes items just above the threshold through", () => {
    expect(statusForConfidence(0.61, 0.6)).toBeUndefined();
  });

  it("defaults to the project threshold constant when none is passed", () => {
    // Default CONFIDENCE_REVIEW_THRESHOLD = 0.6
    expect(statusForConfidence(0.5)).toBe<ProcessingStatus>("needs_review");
    expect(statusForConfidence(0.7)).toBeUndefined();
  });

  it("treats undefined confidence as a pass-through (no status change)", () => {
    // Voice/manual items that never went through recognition keep status undefined.
    expect(statusForConfidence(undefined)).toBeUndefined();
  });
});
