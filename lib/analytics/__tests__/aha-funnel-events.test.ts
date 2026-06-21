/**
 * Unit tests for the first-session "aha" funnel events (issue #720).
 *
 * Mirrors the mock setup of the sibling funnel-events suite: stub the install
 * anchor + react-native-purchases so the fan-out paths resolve, then assert
 * the aha_shown / aha_recipe_opened / first_cook_started wrappers stamp the
 * install anchor and fan out to BOTH sinks (Sentry breadcrumb + RevenueCat
 * attributes) — the wiring that makes the Day-0 lift measurable per [F7].
 */

import * as Sentry from "@sentry/react-native";

import { emitAhaShown, emitAhaRecipeOpened, emitFirstCookStarted } from "../funnel-events";

// --- Mocks (same shape as the sibling funnel-events suite) ----------------

jest.mock("~/lib/install-anchor", () => ({
  getInstallAnchor: () => ({ installId: "install-aha", installAnchorTs: 2_000_000 }),
}));

jest.mock("react-native-purchases", () => {
  const setAttributes = jest.fn();
  return {
    __esModule: true,
    default: { setAttributes },
    setAttributes,
  };
});

jest.mock("react-native-purchases-ui", () => ({
  __esModule: true,
  PAYWALL_RESULT: {
    NOT_PRESENTED: "NOT_PRESENTED",
    ERROR: "ERROR",
    CANCELLED: "CANCELLED",
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
  },
}));

const addBreadcrumbSpy = jest.spyOn(Sentry, "addBreadcrumb");
const captureMessageSpy = jest.spyOn(Sentry, "captureMessage");

import Purchases from "react-native-purchases";
const setAttributesMock = (Purchases as unknown as { setAttributes: jest.Mock }).setAttributes;

beforeEach(() => {
  addBreadcrumbSpy.mockClear();
  captureMessageSpy.mockClear();
  setAttributesMock.mockClear();
});

describe("aha funnel events (#720)", () => {
  it("emitAhaShown stamps the anchor + records cookableCount in the breadcrumb", () => {
    emitAhaShown(3);

    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
    const data = addBreadcrumbSpy.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data).toMatchObject({
      type: "aha_shown",
      installId: "install-aha",
      cookableCount: 3,
    });
    // Non-terminal: breadcrumb, not a captured message.
    expect(captureMessageSpy).not.toHaveBeenCalled();
  });

  it("emitAhaRecipeOpened carries the recipeId detail", () => {
    emitAhaRecipeOpened("r-123");

    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbSpy.mock.calls[0]![0].data).toMatchObject({
      type: "aha_recipe_opened",
      recipeId: "r-123",
    });
  });

  it("emitFirstCookStarted carries the recipeId detail", () => {
    emitFirstCookStarted("r-456");

    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbSpy.mock.calls[0]![0].data).toMatchObject({
      type: "first_cook_started",
      recipeId: "r-456",
    });
  });

  it("fans out to RevenueCat attributes (the second sink)", async () => {
    emitFirstCookStarted("r-789");
    // The RC fan-out is a dynamic import + fire-and-forget; flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(setAttributesMock).toHaveBeenCalled();
    const attrs = setAttributesMock.mock.calls[0]![0] as Record<string, string>;
    expect(attrs["funnel_first_cook_started_ts"]).toBeDefined();
  });

  it("is non-terminal (each occurrence is its own data point, no dedup)", () => {
    emitAhaShown(1);
    emitAhaShown(2);
    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(2);
  });
});
