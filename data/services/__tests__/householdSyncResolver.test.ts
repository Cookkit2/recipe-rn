/// <reference types="jest" />

import { shouldApplyRemoteUpdate } from "../householdSyncResolver";

describe("householdSyncResolver.shouldApplyRemoteUpdate", () => {
  it("applies a strictly newer remote row", () => {
    expect(shouldApplyRemoteUpdate(2000, 1000)).toBe(true);
  });

  it("preserves the local row when remote is strictly older (silent-clobber guard)", () => {
    // Audit defect #1 (HIGH): a staler remote row must NOT overwrite a fresher
    // local edit during the batch pull.
    expect(shouldApplyRemoteUpdate(1000, 2000)).toBe(false);
  });

  it("preserves the local row on a timestamp tie (fall back to local, deterministic)", () => {
    expect(shouldApplyRemoteUpdate(1500, 1500)).toBe(false);
  });

  it("treats a missing/zero local timestamp as server-authoritative", () => {
    expect(shouldApplyRemoteUpdate(1000, 0)).toBe(true);
    // NaN (e.g. unparseable local date) also falls back to server authority
    expect(shouldApplyRemoteUpdate(1000, Number.NaN)).toBe(true);
  });

  it("does not apply when both timestamps are zero/unknown", () => {
    expect(shouldApplyRemoteUpdate(0, 0)).toBe(false);
  });
});
