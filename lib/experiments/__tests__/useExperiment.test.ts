import { renderHook } from "@testing-library/react-native";

import {
  useExperiment,
  getExperimentAssignment,
  setExperimentAssignmentForTesting,
  resetExperimentAssignmentForTesting,
} from "../useExperiment";

// --- Mocks ---------------------------------------------------------------

// In-memory storage backed by a Map, mirroring the install-anchor test mock.
const store = new Map<string, unknown>();
jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(<T>(key: string): T | null => (store.get(key) as T) ?? null),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: jest.fn((key: string) => {
      store.delete(key);
    }),
  },
}));

// Fixed install id so bucketing is deterministic in tests.
jest.mock("~/lib/install-anchor", () => ({
  getInstallAnchor: () => ({
    installId: "install-test",
    installAnchorTs: 1_000_000,
  }),
}));

// Capture exposure emissions without dragging in Sentry / RevenueCat.
const emitFunnelEventMock = jest.fn();
jest.mock("~/lib/analytics/funnel-events", () => ({
  emitFunnelEvent: (...args: unknown[]) => emitFunnelEventMock(...args),
}));

// --- Helpers -------------------------------------------------------------

function resetAll() {
  store.clear();
  emitFunnelEventMock.mockReset();
}

// --- getExperimentAssignment (pure-ish, non-hook) ------------------------

describe("getExperimentAssignment", () => {
  beforeEach(() => resetAll());

  it("returns a variant from the provided list", () => {
    const v = getExperimentAssignment("exp", ["control", "treatment"]);
    expect(["control", "treatment"]).toContain(v);
  });

  it("persists the assignment so a second read returns the same value without recompute drift", () => {
    const first = getExperimentAssignment("exp", ["control", "treatment"]);
    const second = getExperimentAssignment("exp", ["control", "treatment"]);
    expect(second).toBe(first);
    // Stored under the namespaced key.
    expect(store.get("experiment:assignment:exp")).toBe(first);
  });

  it("is deterministic for the same install id", () => {
    resetAll();
    const a = getExperimentAssignment("exp", ["a", "b", "c"]);
    resetExperimentAssignmentForTesting("exp");
    const b = getExperimentAssignment("exp", ["a", "b", "c"]);
    expect(b).toBe(a);
  });

  it("recomputes when the persisted value is no longer in the variants list (variant removed mid-experiment)", () => {
    setExperimentAssignmentForTesting("exp", "deprecated_variant");
    // variants no longer contains "deprecated_variant" → must recompute.
    const v = getExperimentAssignment("exp", ["control", "treatment"]);
    expect(v).not.toBe("deprecated_variant");
    expect(["control", "treatment"]).toContain(v);
  });
});

// --- useExperiment hook --------------------------------------------------

describe("useExperiment", () => {
  beforeEach(() => resetAll());

  it("returns a stable variant", async () => {
    const { result, unmount } = await renderHook(() =>
      useExperiment("exp", ["control", "treatment"])
    );
    expect(["control", "treatment"]).toContain(result.current.variant);
    await unmount();
  });

  it("emits exactly one exposure event on mount (experiment key + variant)", async () => {
    const { result, unmount } = await renderHook(() =>
      useExperiment("trial_length_724", ["control", "long_trial"])
    );
    expect(emitFunnelEventMock).toHaveBeenCalledTimes(1);
    expect(emitFunnelEventMock).toHaveBeenCalledWith("experiment_exposed", {
      detail: { experimentKey: "trial_length_724", variant: result.current.variant },
    });
    expect(result.current.isExposureLogged).toBe(true);
    await unmount();
  });

  it("does not re-emit exposure across re-renders", async () => {
    const { rerender, unmount } = await renderHook(() =>
      useExperiment("exp", ["control", "treatment"])
    );
    await rerender(undefined);
    await rerender(undefined);
    expect(emitFunnelEventMock).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("suppresses exposure when trackExposure:false", async () => {
    const { result, unmount } = await renderHook(() =>
      useExperiment("exp", ["control", "treatment"], { trackExposure: false })
    );
    expect(emitFunnelEventMock).not.toHaveBeenCalled();
    expect(result.current.isExposureLogged).toBe(false);
    await unmount();
  });

  it("keeps the same bucket across hook remounts (persistence)", async () => {
    const variants = ["control", "treatment"];
    const { result: first, unmount: unmountFirst } = await renderHook(() =>
      useExperiment("exp", variants)
    );
    const firstVariant = first.current.variant;
    await unmountFirst();

    // Clear the in-memory hook state by remounting; the persisted assignment
    // must drive the same bucket.
    const { result: second, unmount: unmountSecond } = await renderHook(() =>
      useExperiment("exp", variants)
    );
    expect(second.current.variant).toBe(firstVariant);
    await unmountSecond();
  });

  it("does not throw if emitFunnelEvent throws (best-effort analytics)", async () => {
    emitFunnelEventMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const { result, unmount } = await renderHook(() =>
      useExperiment("exp", ["control", "treatment"])
    );
    expect(result.current.variant).toBeDefined();
    expect(result.current.isExposureLogged).toBe(false);
    await unmount();
  });

  it("different experiment keys bucket independently for the same install", async () => {
    const variants = ["control", "treatment"];
    const { result: a, unmount: ua } = await renderHook(() =>
      useExperiment("trial_length_724", variants)
    );
    const { result: b, unmount: ub } = await renderHook(() =>
      useExperiment("paywall_hardness_725", variants)
    );
    // Both are valid variants (cannot assert they differ — collision possible).
    expect(variants).toContain(a.current.variant);
    expect(variants).toContain(b.current.variant);
    await ua();
    await ub();
  });
});
