import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

export const isValidSubscription = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (typeof customerInfo.entitlements.active["pro"] !== "undefined") {
      return true;
    }
    return false;
  } catch (e) {
    console.error(e);
    return false;
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
