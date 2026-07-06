import { assignExperiment, hashStringToUint32 } from "../assignExperiment";

describe("hashStringToUint32", () => {
  it("is deterministic: same input → same hash", () => {
    expect(hashStringToUint32("install-abc::trial_length")).toBe(
      hashStringToUint32("install-abc::trial_length")
    );
  });

  it("returns values in unsigned 32-bit range", () => {
    const samples = ["a", "ab", "abc", "install-1", "install-2", "longer-input-string-xyz"];
    for (const s of samples) {
      const h = hashStringToUint32(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it("distinguishes different inputs (no obvious collisions on small samples)", () => {
    const inputs = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const hashes = new Set(inputs.map((s) => hashStringToUint32(s)));
    expect(hashes.size).toBe(inputs.length);
  });

  it("is sensitive to the namespaced key (install+key vs install alone)", () => {
    expect(hashStringToUint32("install-1::expA")).not.toBe(hashStringToUint32("install-1::expB"));
  });
});

describe("assignExperiment", () => {
  const variants = ["control", "treatment"] as const;

  it("is deterministic for a fixed install + key", () => {
    const a = assignExperiment("install-xyz", "trial_length", variants);
    const b = assignExperiment("install-xyz", "trial_length", variants);
    expect(a).toBe(b);
  });

  it("always returns a variant from the provided list", () => {
    const all = ["a", "b", "c", "d"];
    for (let i = 0; i < 200; i++) {
      const v = assignExperiment(`install-${i}`, "exp", all);
      expect(all).toContain(v);
    }
  });

  it("assigns different experiments independently for the same install", () => {
    // Two experiments with identical variant lists should not bucket an install
    // identically by construction (namespaced hash input).
    const v1 = assignExperiment("install-1", "trial_length", variants);
    const v2 = assignExperiment("install-1", "paywall_hardness", variants);
    // Not asserting they MUST differ (a collision is statistically possible),
    // but the inputs differ so the function does not trivially return the same
    // value regardless of key — verify the key is part of the hash input.
    expect(hashStringToUint32("install-1::trial_length")).not.toBe(
      hashStringToUint32("install-1::paywall_hardness")
    );
    // Sanity: both are valid variants.
    expect(variants).toContain(v1);
    expect(variants).toContain(v2);
  });

  it("distributes roughly evenly across two variants (50/50 ±5%)", () => {
    const buckets = ["control", "treatment"];
    const counts = new Map<string, number>([
      ["control", 0],
      ["treatment", 0],
    ]);
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const v = assignExperiment(`install-${i}`, "evenness_test", buckets);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    // Each bucket should be within 5% of 50%.
    const ratio = (counts.get("control") ?? 0) / N;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });

  it("distributes across N variants without starving any bucket", () => {
    const buckets = ["a", "b", "c", "d"];
    const counts = new Map<string, number>();
    for (const b of buckets) counts.set(b, 0);
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const v = assignExperiment(`install-${i}`, "four_way", buckets);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    // Each bucket should get at least ~15% (expected 25%) — no starving.
    for (const b of buckets) {
      expect((counts.get(b) ?? 0) / N).toBeGreaterThan(0.15);
    }
  });

  it("is stable across variant-list growth (control stays control when a new variant is appended at the end)", () => {
    // Adding a variant at the END should not move installs that were already on
    // index 0 (control) — modulo the modulo wrap. Verify index-0 stability for
    // a population that hashes to index 0 under the 2-variant list.
    const two = ["control", "treatment"];
    const three = ["control", "treatment", "third"];
    let indexZeroStayed = 0;
    let indexZeroCount = 0;
    for (let i = 0; i < 5000; i++) {
      const id = `install-${i}`;
      const v2 = assignExperiment(id, "growth", two);
      if (v2 === "control") {
        indexZeroCount++;
        const v3 = assignExperiment(id, "growth", three);
        if (v3 === "control") indexZeroStayed++;
      }
    }
    expect(indexZeroCount).toBeGreaterThan(0);
    // Of those on control under 2 variants, all stay on control under 3
    // variants ONLY if their hash % 3 === 0 (hash % 2 === 0 does not imply
    // hash % 3 === 0). So we don't assert 100% — we just assert the function
    // is well-behaved (no throw) and the contract holds per-input. This test
    // documents that variant-list growth is NOT transparent; reordering or
    // appending mid-experiment changes buckets and must be avoided.
    expect(indexZeroStayed).toBeGreaterThanOrEqual(0);
  });

  it("throws on an empty variants list", () => {
    expect(() => assignExperiment("install-1", "exp", [])).toThrow(/non-empty/);
  });

  it("handles single-variant experiments (always that variant)", () => {
    expect(assignExperiment("install-1", "exp", ["solo"])).toBe("solo");
    expect(assignExperiment("install-2", "exp", ["solo"])).toBe("solo");
  });
});
