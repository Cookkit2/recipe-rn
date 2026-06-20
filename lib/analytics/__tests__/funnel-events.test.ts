import * as Sentry from "@sentry/react-native";
import type { CustomerInfo } from "react-native-purchases";
import { PAYWALL_RESULT } from "react-native-purchases-ui";

import {
  buildFunnelEvent,
  diffCustomerInfo,
  emitFunnelEvent,
  emitPaywallPresented,
  isDay0Cancel,
  paywallResultToEvent,
  resetFunnelEventStateForTesting,
  DAY0_WINDOW_MS,
  type FunnelEventType,
} from "../funnel-events";

// --- Mocks ---------------------------------------------------------------

// Mock the install anchor so the funnel-events test does not drag in the real
// ~/data storage chain (MMKV) which is not transformable in the node env.
// The factory is hoisted above const declarations, so inline the fixture.
jest.mock("~/lib/install-anchor", () => ({
  getInstallAnchor: () => ({ installId: "install-abc", installAnchorTs: 1_000_000 }),
}));

// Purchases default export must expose setAttributes for the RevenueCat fan-out
// path. The dynamic import() in funnel-events resolves this mock.
jest.mock("react-native-purchases", () => {
  const setAttributes = jest.fn();
  return {
    __esModule: true,
    default: { setAttributes },
    setAttributes,
  };
});

// Purchases-UI only needs the PAYWALL_RESULT constant for mapping tests.
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

// The Sentry manual mock exports no-op functions; spy on them.
const addBreadcrumbSpy = jest.spyOn(Sentry, "addBreadcrumb");
const captureMessageSpy = jest.spyOn(Sentry, "captureMessage");

// Re-import the mocked default so we can assert setAttributes calls.
import Purchases from "react-native-purchases";
const setAttributesMock = (Purchases as unknown as { setAttributes: jest.Mock }).setAttributes;

// --- Fixtures -------------------------------------------------------------

const ANCHOR = { installId: "install-abc", installAnchorTs: 1_000_000 };

function customerInfoFixture(
  overrides: {
    active?: boolean;
    periodType?: string;
    unsubscribeDetectedAt?: string | null;
    refundedAt?: string | null;
    productIdentifier?: string;
  } = {}
): CustomerInfo {
  const active = overrides.active ?? false;
  return {
    entitlements: {
      all: {},
      active: active
        ? {
            Pro: {
              identifier: "Pro",
              isActive: true,
              willRenew: true,
              periodType: overrides.periodType ?? "NORMAL",
              latestPurchaseDate: "2024-01-01T00:00:00Z",
              latestPurchaseDateMillis: Date.now(),
              originalPurchaseDate: "2024-01-01T00:00:00Z",
              originalPurchaseDateMillis: Date.now(),
              expirationDate: null,
              expirationDateMillis: null,
              store: "APP_STORE",
              productIdentifier: overrides.productIdentifier ?? "pro_monthly",
              productPlanIdentifier: null,
              isSandbox: false,
              unsubscribeDetectedAt: overrides.unsubscribeDetectedAt ?? null,
              unsubscribeDetectedAtMillis: null,
              billingIssueDetectedAt: null,
              billingIssueDetectedAtMillis: null,
              ownershipType: "PURCHASED",
              verification: "NOT_REQUESTED",
            },
          }
        : {},
      verification: "NOT_REQUESTED",
    },
    activeSubscriptions: active ? ["pro_monthly"] : [],
    allPurchasedProductIdentifiers: active ? ["pro_monthly"] : [],
    latestExpirationDate: null,
    firstSeen: "2024-01-01T00:00:00Z",
    originalAppUserId: "user-1",
    requestDate: "2024-01-01T00:00:00Z",
    allExpirationDates: {},
    allPurchaseDates: {},
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: active
      ? {
          pro_monthly: {
            productIdentifier: "pro_monthly",
            purchaseDate: "2024-01-01T00:00:00Z",
            originalPurchaseDate: null,
            expiresDate: null,
            store: "APP_STORE",
            unsubscribeDetectedAt: null,
            isSandbox: false,
            billingIssuesDetectedAt: null,
            gracePeriodExpiresDate: null,
            ownershipType: "PURCHASED",
            periodType: "NORMAL",
            refundedAt: overrides.refundedAt ?? null,
            storeTransactionId: null,
            isActive: true,
            willRenew: true,
          },
        }
      : {},
  } as CustomerInfo;
}

// -------------------------------------------------------------------------

describe("funnel-events: pure helpers", () => {
  describe("isDay0Cancel", () => {
    it("classifies a cancel within 24h of install as Day-0", () => {
      expect(
        isDay0Cancel(ANCHOR.installAnchorTs, ANCHOR.installAnchorTs + 2 * 60 * 60 * 1000)
      ).toBe(true);
    });

    it("classifies a cancel beyond 24h of install as NOT Day-0", () => {
      expect(
        isDay0Cancel(ANCHOR.installAnchorTs, ANCHOR.installAnchorTs + 26 * 60 * 60 * 1000)
      ).toBe(false);
    });

    it("treats the exact 24h boundary as Day-0", () => {
      expect(isDay0Cancel(0, DAY0_WINDOW_MS)).toBe(true);
    });
  });

  describe("paywallResultToEvent", () => {
    it.each([
      [PAYWALL_RESULT.PURCHASED, "trial_started"],
      [PAYWALL_RESULT.RESTORED, "paid_converted"],
      [PAYWALL_RESULT.CANCELLED, "paywall_dismissed"],
      [PAYWALL_RESULT.NOT_PRESENTED, "paywall_dismissed"],
      [PAYWALL_RESULT.ERROR, "paywall_error"],
    ] as const)("maps %s to %s", (result, expected) => {
      const mapped = paywallResultToEvent(result, "camera_capture");
      expect(mapped).not.toBeNull();
      expect(mapped?.type).toBe(expected);
      expect(mapped?.triggerSource).toBe("camera_capture");
    });

    it("returns null for an unknown result", () => {
      expect(paywallResultToEvent("BOGUS" as PAYWALL_RESULT, "unknown")).toBeNull();
    });
  });

  describe("diffCustomerInfo", () => {
    it("emits entitlement_changed + paid_converted when Pro goes active", () => {
      const prev = customerInfoFixture({ active: false });
      const next = customerInfoFixture({ active: true });
      const events = diffCustomerInfo(prev, next, ANCHOR).map((e) => e.type);
      expect(events).toContain("entitlement_changed");
      expect(events).toContain("paid_converted");
    });

    it("emits subscription_cancelled when Pro goes inactive (Day-0)", () => {
      const prev = customerInfoFixture({ active: true });
      const next = customerInfoFixture({ active: false });
      const events = diffCustomerInfo(prev, next, ANCHOR, {
        now: ANCHOR.installAnchorTs + 2 * 60 * 60 * 1000, // 2h later
      }).map((e) => e.type);
      expect(events).toContain("subscription_cancelled");
      expect(events).toContain("day0_trial_cancelled");
    });

    it("classifies a >24h cancel as NOT Day-0", () => {
      const prev = customerInfoFixture({ active: true });
      const next = customerInfoFixture({ active: false });
      const events = diffCustomerInfo(prev, next, ANCHOR, {
        now: ANCHOR.installAnchorTs + 26 * 60 * 60 * 1000, // 26h later
      }).map((e) => e.type);
      expect(events).toContain("subscription_cancelled");
      expect(events).not.toContain("day0_trial_cancelled");
    });

    it("emits subscription_cancelled when unsubscribeDetectedAt newly appears", () => {
      const prev = customerInfoFixture({ active: true, unsubscribeDetectedAt: null });
      const next = customerInfoFixture({
        active: true,
        unsubscribeDetectedAt: "2024-01-02T00:00:00Z",
      });
      const events = diffCustomerInfo(prev, next, ANCHOR, {
        now: ANCHOR.installAnchorTs + 3 * 60 * 60 * 1000,
      }).map((e) => e.type);
      expect(events).toContain("subscription_cancelled");
      expect(events).toContain("day0_trial_cancelled");
    });

    it("emits subscription_refunded when a subscription's refundedAt newly appears", () => {
      const prev = customerInfoFixture({ active: true, refundedAt: null });
      const next = customerInfoFixture({ active: true, refundedAt: "2024-01-03T00:00:00Z" });
      const events = diffCustomerInfo(prev, next, ANCHOR).map((e) => e.type);
      expect(events).toContain("subscription_refunded");
    });

    it("emits nothing when nothing changed", () => {
      const prev = customerInfoFixture({ active: true });
      const next = customerInfoFixture({ active: true });
      expect(diffCustomerInfo(prev, next, ANCHOR)).toEqual([]);
    });

    it("handles null/undefined inputs safely", () => {
      const events = diffCustomerInfo(null, customerInfoFixture({ active: true }), ANCHOR).map(
        (e) => e.type
      );
      expect(events).toContain("paid_converted");
      expect(() => diffCustomerInfo(undefined, undefined, ANCHOR)).not.toThrow();
    });
  });
});

describe("funnel-events: buildFunnelEvent", () => {
  it("stamps install anchor + eventTs + discriminator alias", () => {
    const evt = buildFunnelEvent("trial_started", {
      triggerSource: "camera_capture",
      now: 5_000_000,
    });
    expect(evt.type).toBe("trial_started");
    expect(evt.event).toBe("trial_started");
    expect(evt.installId).toBe(ANCHOR.installId);
    expect(evt.installAnchorTs).toBe(ANCHOR.installAnchorTs);
    expect(evt.eventTs).toBe(5_000_000);
    expect(evt.triggerSource).toBe("camera_capture");
  });

  it("threads detail fields through", () => {
    const evt = buildFunnelEvent("paid_converted", { detail: { productId: "pro_yearly" } });
    expect(evt.productId).toBe("pro_yearly");
  });
});

describe("funnel-events: emitFunnelEvent (fan-out + safety)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFunnelEventStateForTesting();
  });

  it("forwards non-terminal events to Sentry as breadcrumbs", () => {
    emitFunnelEvent("paywall_presented", { triggerSource: "camera_capture" });
    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
    expect(captureMessageSpy).not.toHaveBeenCalled();
    const crumb = addBreadcrumbSpy.mock.calls[0]![0];
    expect(crumb.category).toBe("funnel");
    expect(crumb.message).toBe("funnel:paywall_presented");
    expect(crumb.data).toMatchObject({
      type: "paywall_presented",
      triggerSource: "camera_capture",
    });
  });

  it("forwards terminal events to Sentry as captureMessage", () => {
    emitFunnelEvent("paid_converted");
    expect(captureMessageSpy).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbSpy).not.toHaveBeenCalled();
  });

  it("fans out to BOTH Sentry and RevenueCat in a single call", async () => {
    emitFunnelEvent("trial_started", { triggerSource: "recipe_start_cooking" });
    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
    // RevenueCat fan-out is async (dynamic import); flush.
    await Promise.resolve();
    await Promise.resolve();
    expect(setAttributesMock).toHaveBeenCalled();
    const attrs = setAttributesMock.mock.calls[setAttributesMock.mock.calls.length - 1]![0];
    expect(attrs["funnel_trial_started_ts"]).toBeDefined();
  });

  it("is idempotent for terminal events (paid_converted fires once)", () => {
    const first = emitFunnelEvent("paid_converted");
    const second = emitFunnelEvent("paid_converted");
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(captureMessageSpy).toHaveBeenCalledTimes(1);
  });

  it("does not throw when Sentry.addBreadcrumb throws", () => {
    addBreadcrumbSpy.mockImplementation(() => {
      throw new Error("sentry down");
    });
    expect(() => emitFunnelEvent("paywall_dismissed")).not.toThrow();
  });

  it("does not throw when Purchases.setAttributes throws", async () => {
    setAttributesMock.mockImplementation(() => {
      throw new Error("rc down");
    });
    expect(() => emitFunnelEvent("paywall_dismissed")).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });

  it("emitPaywallPresented emits the presented event with the trigger source", () => {
    emitPaywallPresented("ingredient_confirmation");
    expect(addBreadcrumbSpy).toHaveBeenCalledTimes(1);
    expect(addBreadcrumbSpy.mock.calls[0]![0].data).toMatchObject({
      type: "paywall_presented",
      triggerSource: "ingredient_confirmation",
    });
  });
});

describe("funnel-events: no-op safety without anchor", () => {
  // Cover the case where the anchor cannot be materialized — getInstallAnchor
  // should still produce an anchor from the (mocked) storage, so this is the
  // happy path; the throw-guard lives in emitFunnelEvent's try/catch.
  it("returns null from emitFunnelEvent if a terminal event already fired", () => {
    resetFunnelEventStateForTesting();
    emitFunnelEvent("subscription_refunded");
    expect(emitFunnelEvent("subscription_refunded")).toBeNull();
  });
});

// Compile-time guard that FunnelEventType is the closed set the issue requires.
const _EXPECTED_EVENT_TYPES: FunnelEventType[] = [
  "app_first_open",
  "session_start",
  "paywall_presented",
  "paywall_dismissed",
  "paywall_error",
  "trial_started",
  "paid_converted",
  "day0_trial_cancelled",
  "subscription_cancelled",
  "subscription_refunded",
  "entitlement_changed",
];
void _EXPECTED_EVENT_TYPES;
