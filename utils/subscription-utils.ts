import { SystemBars } from "react-native-edge-to-edge";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

export const isValidSubscription = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log("Customer Info:", customerInfo);
    const entitlements = customerInfo.entitlements.active["Pro"];

    return entitlements;
  } catch (e) {
    console.error(e);
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
  const entitlements = await isValidSubscription();
  if (entitlements) {
    // User already has a valid subscription
    return true;
  }

  SystemBars.setStyle("light");
  const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: "entla45938e5ff",
  });
  SystemBars.setStyle("auto");

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
