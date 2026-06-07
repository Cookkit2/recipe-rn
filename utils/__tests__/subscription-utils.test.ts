import Purchases from "react-native-purchases";
import { isValidSubscription } from "../subscription-utils";
import { log } from "../logger";

jest.mock("react-native-purchases", () => ({
  getCustomerInfo: jest.fn(),
}));

jest.mock("../logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("expo-status-bar", () => ({
  setStatusBarStyle: jest.fn(),
}));

jest.mock("react-native-purchases-ui", () => ({
  presentPaywall: jest.fn(),
  presentPaywallIfNeeded: jest.fn(),
  PAYWALL_RESULT: {
    NOT_PRESENTED: "NOT_PRESENTED",
    ERROR: "ERROR",
    CANCELLED: "CANCELLED",
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
  },
}));

jest.mock("~/lib/subscription-query-sync", () => ({
  invalidateSubscriptionEntitlementsQuery: jest.fn(),
}));

describe("isValidSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the entitlement if user has an active Pro subscription", async () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {
          Pro: { identifier: "Pro", isActive: true },
        },
      },
    };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const result = await isValidSubscription();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(result).toEqual({ identifier: "Pro", isActive: true });
    expect(log.info).toHaveBeenCalledWith("Customer Info:", mockCustomerInfo);
  });

  it("should return undefined if user does not have an active Pro subscription", async () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {},
      },
    };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const result = await isValidSubscription();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("should log error and return undefined if getting customer info fails", async () => {
    const error = new Error("Failed to get customer info");
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(error);

    const result = await isValidSubscription();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith("Error getting customer info:", error);
    expect(result).toBeUndefined();
  });
});

describe("presentPaywall", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return false and invalidate query if paywall is not presented", async () => {
    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywall.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED);

    const { presentPaywall } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywall();

    expect(RevenueCatUI.presentPaywall).toHaveBeenCalled();
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should return false if paywall results in error", async () => {
    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywall.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.ERROR);

    const { presentPaywall } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywall();

    expect(RevenueCatUI.presentPaywall).toHaveBeenCalled();
    expect(invalidateSubscriptionEntitlementsQuery).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should return false if paywall is cancelled", async () => {
    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywall.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.CANCELLED);

    const { presentPaywall } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywall();

    expect(RevenueCatUI.presentPaywall).toHaveBeenCalled();
    expect(invalidateSubscriptionEntitlementsQuery).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should return true and invalidate query if subscription is purchased", async () => {
    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywall.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.PURCHASED);

    const { presentPaywall } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywall();

    expect(RevenueCatUI.presentPaywall).toHaveBeenCalled();
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should return true and invalidate query if subscription is restored", async () => {
    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywall.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.RESTORED);

    const { presentPaywall } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywall();

    expect(RevenueCatUI.presentPaywall).toHaveBeenCalled();
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should return false for unknown paywall result", async () => {
    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywall.mockResolvedValue("UNKNOWN_RESULT");

    const { presentPaywall } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywall();

    expect(RevenueCatUI.presentPaywall).toHaveBeenCalled();
    expect(invalidateSubscriptionEntitlementsQuery).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe("presentPaywallIfNeeded", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true and skip paywall if user already has active subscription", async () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {
          Pro: { identifier: "Pro", isActive: true },
        },
      },
    };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const { presentPaywallIfNeeded } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");
    const RevenueCatUI = require("react-native-purchases-ui");

    const result = await presentPaywallIfNeeded();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith("User already has active subscription, skipping paywall");
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(RevenueCatUI.presentPaywallIfNeeded).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should return false and log error if getting customer info fails", async () => {
    const error = new Error("Failed to get customer info");
    (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(error);

    const { presentPaywallIfNeeded } = require("../subscription-utils");

    const result = await presentPaywallIfNeeded();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith("Error in presentPaywallIfNeeded:", error);
    expect(result).toBe(false);
  });

  it("should set status bar style to light before presenting paywall and auto after", async () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {},
      },
    };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED);

    const { presentPaywallIfNeeded } = require("../subscription-utils");
    const { setStatusBarStyle } = require("expo-status-bar");

    await presentPaywallIfNeeded();

    expect(setStatusBarStyle).toHaveBeenNthCalledWith(1, "light", true);
    expect(RevenueCatUI.presentPaywallIfNeeded).toHaveBeenCalledWith({ requiredEntitlementIdentifier: "Pro" });
    expect(setStatusBarStyle).toHaveBeenNthCalledWith(2, "auto", true);
  });

  it("should set status bar style back to auto even if presentPaywallIfNeeded throws", async () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {},
      },
    };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    const error = new Error("Paywall error");
    RevenueCatUI.presentPaywallIfNeeded.mockRejectedValue(error);

    const { presentPaywallIfNeeded } = require("../subscription-utils");
    const { setStatusBarStyle } = require("expo-status-bar");

    const result = await presentPaywallIfNeeded();

    expect(setStatusBarStyle).toHaveBeenNthCalledWith(1, "light", true);
    expect(RevenueCatUI.presentPaywallIfNeeded).toHaveBeenCalled();
    expect(setStatusBarStyle).toHaveBeenNthCalledWith(2, "auto", true);
    expect(result).toBe(false);
    expect(log.error).toHaveBeenCalledWith("Error in presentPaywallIfNeeded:", error);
  });

  it("should return false and invalidate query if paywall is not presented", async () => {
    const mockCustomerInfo = { entitlements: { active: {} } };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED);

    const { presentPaywallIfNeeded } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywallIfNeeded();

    expect(log.info).toHaveBeenCalledWith("Paywall not presented");
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should return false if paywall results in error", async () => {
    const mockCustomerInfo = { entitlements: { active: {} } };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.ERROR);

    const { presentPaywallIfNeeded } = require("../subscription-utils");

    const result = await presentPaywallIfNeeded();

    expect(log.error).toHaveBeenCalledWith("Paywall error");
    expect(result).toBe(false);
  });

  it("should return false if paywall is cancelled", async () => {
    const mockCustomerInfo = { entitlements: { active: {} } };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.CANCELLED);

    const { presentPaywallIfNeeded } = require("../subscription-utils");

    const result = await presentPaywallIfNeeded();

    expect(log.info).toHaveBeenCalledWith("Paywall cancelled by user");
    expect(result).toBe(false);
  });

  it("should return true and invalidate query if subscription is purchased", async () => {
    const mockCustomerInfo = { entitlements: { active: {} } };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.PURCHASED);

    const { presentPaywallIfNeeded } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywallIfNeeded();

    expect(log.info).toHaveBeenCalledWith("User purchased subscription");
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should return true and invalidate query if subscription is restored", async () => {
    const mockCustomerInfo = { entitlements: { active: {} } };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue(RevenueCatUI.PAYWALL_RESULT.RESTORED);

    const { presentPaywallIfNeeded } = require("../subscription-utils");
    const { invalidateSubscriptionEntitlementsQuery } = require("~/lib/subscription-query-sync");

    const result = await presentPaywallIfNeeded();

    expect(log.info).toHaveBeenCalledWith("User restored subscription");
    expect(invalidateSubscriptionEntitlementsQuery).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should return false for unknown paywall result", async () => {
    const mockCustomerInfo = { entitlements: { active: {} } };
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(mockCustomerInfo);

    const RevenueCatUI = require("react-native-purchases-ui");
    RevenueCatUI.presentPaywallIfNeeded.mockResolvedValue("UNKNOWN_RESULT");

    const { presentPaywallIfNeeded } = require("../subscription-utils");

    const result = await presentPaywallIfNeeded();

    expect(log.warn).toHaveBeenCalledWith("Unknown paywall result:", "UNKNOWN_RESULT");
    expect(result).toBe(false);
  });
});
