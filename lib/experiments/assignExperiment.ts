/**
 * Pure experiment assignment — the testable core of the A/B layer.
 *
 * Deterministically maps an install identifier + experiment key to a variant.
 * Used by `useExperiment` (and anywhere a synchronous bucket read is needed,
 * e.g. resolving the bucket before the first paywall surface per #724).
 *
 * Design notes:
 *  - DETERMINISTIC: the same (installId, key, variants) triple ALWAYS yields the
 *    same variant. This is the stability contract #724 acceptance criterion #2
 *    requires ("a single user receives the same bucket across reinstalls within
 *    the test window").
 *  - UNIFORM: the hash distributes inputs roughly evenly across variants so a
 *    50/50 split actually approximates 50/50.
 *  - SYNCHRONOUS + dependency-free: bucketing must be readable on the hot path
 *    (the Day-0 paywall path can never block on an async fetch, per [F7]). We
 *    therefore use a self-contained 32-bit hash rather than the async
 *    `Crypto.digestStringAsync`. This is bucketing, not a security primitive —
 *    cryptographic strength is not the goal; determinism + uniform spread is.
 *  - PURE: takes every input explicitly and has no side effects, so the Jest
 *    suite can assert determinism + distribution without storage or React.
 */

/**
 * FNV-1a 32-bit hash. Stable across JS runtimes (Hermes / V8 / JSC) because it
 * only uses integer arithmetic and `charCodeAt` — no engine-specific hashing,
 * no `Math.random`, no floating-point drift.
 *
 * Returns a non-negative 32-bit integer.
 */
export function hashStringToUint32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (2166136261).
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime (16777619). `Math.imul` keeps this in 32-bit space without
    // floating-point precision loss.
    hash = Math.imul(hash, 0x01000193);
  }
  // Force into unsigned 32-bit range.
  return hash >>> 0;
}

/**
 * Deterministically select a variant for a given install + experiment key.
 *
 * Throws if `variants` is empty (an experiment with no variants is a
 * programming error — callers must pass at least one).
 *
 * Pure: identical inputs → identical output, every call, every runtime.
 */
export function assignExperiment(
  installId: string,
  key: string,
  variants: readonly string[]
): string {
  if (variants.length === 0) {
    throw new Error(`assignExperiment: variants must be non-empty (key="${key}")`);
  }
  // Namespace the hash input by key so two experiments with the same variant
  // lists don't bucket an install identically (independent per-experiment
  // assignment).
  const hash = hashStringToUint32(`${installId}::${key}`);
  return variants[hash % variants.length] as string;
}
