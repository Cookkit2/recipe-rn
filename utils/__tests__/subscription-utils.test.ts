import { isValidSubscription, presentPaywall, presentPaywallIfNeeded } from "../subscription-utils";
import { log } from "../logger";
import { setStatusBarStyle } from "expo-status-bar";
import { invalidateSubscriptionEntitlementsQuery } from "~/lib/subscription-query-sync";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

jest.mock("react-native-purchases", () => {
  return {
    getCustomerInfo: jest.fn(),
    default: {
      getCustomerInfo: jest.fn(),
    },
  };
});
jest.mock("react-native-purchases-ui", () => {
  return {
    PAYWALL_RESULT: {
      NOT_PRESENTED: "NOT_PRESENTED",
      ERROR: "ERROR",
      CANCELLED: "CANCELLED",
      PURCHASED: "PURCHASED",
      RESTORED: "RESTORED",
    },
    presentPaywall: jest.fn(),
    presentPaywallIfNeeded: jest.fn(),
    default: {
      presentPaywall: jest.fn(),
      presentPaywallIfNeeded: jest.fn(),
    },
  };
});
jest.mock("../logger");
jest.mock("~/lib/subscription-query-sync", () => ({
  invalidateSubscriptionEntitlementsQuery: jest.fn(),
}));
// Mock the funnel-analytics path so this test (which exercises the paywall
// switch) does not pull in the MMKV storage chain via lib/install-anchor.
jest.mock("~/lib/analytics/funnel-events", () => ({
  emitPaywallPresented: jest.fn(),
  emitFunnelEvent: jest.fn(),
  paywallResultToEvent: jest.fn((result) => ({ type: "trial_started", triggerSource: "unknown" })),
}));
jest.mock("expo-status-bar", () => ({
  setStatusBarStyle: jest.fn(),
}));

describe("subscription-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isValidSubscription", () => {
    it("should return false when Purchases.getCustomerInfo() throws an error", async () => {
      // Mock error
      const error = new Error("Mocked error");
      (Purchases.getCustomerInfo as jest.Mock).mockRejectedValueOnce(error);

      const result = await isValidSubscription();

      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalledWith("Error getting customer info:", error);
    });

    it("should return the entitlement when customer info has active subscription", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {
            Pro: true,
          },
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);

      const result = await isValidSubscription();

      expect(result).toBe(true);
      expect(log.info).toHaveBeenCalledWith("Customer Info:", mockCustomerInfo);
    });

    it("should return undefined/falsy when customer info does not have active subscription", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);

      const result = await isValidSubscription();

      expect(result).toBeUndefined();
      expect(log.info).toHaveBeenCalledWith("Customer Info:", mockCustomerInfo);
    });

    it("should return false when accessing entitlements throws an error (malformed customer info)", async () => {
      // Mock malformed customer info missing 'entitlements'
      const mockCustomerInfo = {};
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);

      const result = await isValidSubscription();

      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalled();
      // Error message check is optional, but we know it gets logged
    });

    it("should return false when customer info is malformed (missing active entitlements object)", async () => {
      const mockCustomerInfo = {
        entitlements: {},
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);

      const result = await isValidSubscription();

      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalled();
    });

    it("should return undefined/falsy when customer has a different active subscription", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {
            Basic: true,
          },
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);

      const result = await isValidSubscription();

      expect(result).toBeUndefined();
      expect(log.info).toHaveBeenCalledWith("Customer Info:", mockCustomerInfo);
    });
  });

  describe("presentPaywall", () => {
    it("should return false when NOT_PRESENTED", async () => {
      (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce(
        PAYWALL_RESULT.NOT_PRESENTED
      );
      const result = await presentPaywall();
      expect(result).toBe(false);
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    });

    it("should return false when ERROR", async () => {
      (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce(PAYWALL_RESULT.ERROR);
      const result = await presentPaywall();
      expect(result).toBe(false);
      expect(invalidateSubscriptionEntitlementsQuery).not.toHaveBeenCalled();
    });

    it("should return false when CANCELLED", async () => {
      (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce(PAYWALL_RESULT.CANCELLED);
      const result = await presentPaywall();
      expect(result).toBe(false);
      expect(invalidateSubscriptionEntitlementsQuery).not.toHaveBeenCalled();
    });

    it("should return true when PURCHASED", async () => {
      (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce(PAYWALL_RESULT.PURCHASED);
      const result = await presentPaywall();
      expect(result).toBe(true);
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    });

    it("should return true when RESTORED", async () => {
      (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce(PAYWALL_RESULT.RESTORED);
      const result = await presentPaywall();
      expect(result).toBe(true);
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    });

    it("should return false when unknown result", async () => {
      (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce("UNKNOWN_RESULT");
      const result = await presentPaywall();
      expect(result).toBe(false);
    });
  });

  describe("presentPaywallIfNeeded", () => {
    it("should return true when customer already has active subscription", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {
            Pro: true,
          },
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(true);
      expect(log.info).toHaveBeenCalledWith(
        "User already has active subscription, skipping paywall"
      );
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
      expect(RevenueCatUI.presentPaywallIfNeeded).not.toHaveBeenCalled();
    });

    it("should return false when paywall is NOT_PRESENTED", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
        PAYWALL_RESULT.NOT_PRESENTED
      );

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(false);
      expect(log.info).toHaveBeenCalledWith("Paywall not presented");
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
      expect(setStatusBarStyle).toHaveBeenCalledWith("light", true);
      expect(setStatusBarStyle).toHaveBeenCalledWith("auto", true);
    });

    it("should return false when paywall ERROR", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
        PAYWALL_RESULT.ERROR
      );

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalledWith("Paywall error");
    });

    it("should return false when paywall CANCELLED", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
        PAYWALL_RESULT.CANCELLED
      );

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(false);
      expect(log.info).toHaveBeenCalledWith("Paywall cancelled by user");
    });

    it("should return true when paywall PURCHASED", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
        PAYWALL_RESULT.PURCHASED
      );

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(true);
      expect(log.info).toHaveBeenCalledWith("User purchased subscription");
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    });

    it("should return true when paywall RESTORED", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce(
        PAYWALL_RESULT.RESTORED
      );

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(true);
      expect(log.info).toHaveBeenCalledWith("User restored subscription");
      expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    });

    it("should return false when paywall result is unknown", async () => {
      const mockCustomerInfo = {
        entitlements: {
          active: {},
        },
      };
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(mockCustomerInfo);
      (RevenueCatUI.presentPaywallIfNeeded as jest.Mock).mockResolvedValueOnce("UNKNOWN_RESULT");

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(false);
      expect(log.warn).toHaveBeenCalledWith("Unknown paywall result:", "UNKNOWN_RESULT");
    });

    it("should return false when customer info throws an error", async () => {
      const error = new Error("Mocked error");
      (Purchases.getCustomerInfo as jest.Mock).mockRejectedValueOnce(error);

      const result = await presentPaywallIfNeeded();

      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalledWith("Error in presentPaywallIfNeeded:", error);
    });
  });
});
