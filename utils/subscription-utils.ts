import { setStatusBarStyle } from "expo-status-bar";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { log } from "./logger";

// Shared entitlement identifier constant
const ENTITLEMENT_IDENTIFIER = "Cookkit Pro";

export const isValidSubscription = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    log.info("Customer Info:", customerInfo);
    // Use the same entitlement identifier as configured in RevenueCat dashboard
    const entitlements = customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER];

    return entitlements;
  } catch (e) {
    log.error("Error getting customer info:", e);
  }
};

export async function presentPaywall(): Promise<boolean> {
  // Present paywall for current offering:
  const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

  switch (paywallResult) {
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    default:
      return false;
  }
}

export async function presentPaywallIfNeeded(): Promise<boolean> {
  try {
    // Get fresh customer info from RevenueCat
    const customerInfo = await Purchases.getCustomerInfo();
    log.info("presentPaywallIfNeeded - Customer Info:", customerInfo);

    // Check if user has active "Cookkit Pro" entitlement
    const hasActiveSubscription = customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER];

    if (hasActiveSubscription) {
      // User already has a valid subscription, no need to show paywall
      log.info("User already has active subscription, skipping paywall");
      return true;
    }

    // No active subscription, show paywall
    log.info("No active subscription, presenting paywall");
    setStatusBarStyle("light", true);
    let paywallResult: PAYWALL_RESULT;
    try {
      paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_IDENTIFIER,
      });
    } finally {
      setStatusBarStyle("auto", true);
    }

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
        log.info("Paywall not presented");
        return false;
      case PAYWALL_RESULT.ERROR:
        log.error("Paywall error");
        return false;
      case PAYWALL_RESULT.CANCELLED:
        log.info("Paywall cancelled by user");
        return false;
      case PAYWALL_RESULT.PURCHASED:
        log.info("User purchased subscription");
        return true;
      case PAYWALL_RESULT.RESTORED:
        log.info("User restored subscription");
        return true;
      default:
        log.warn("Unknown paywall result:", paywallResult);
        return false;
    }
  } catch (e) {
    log.error("Error in presentPaywallIfNeeded:", e);
    return false;
  }
}
