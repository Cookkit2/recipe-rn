import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";

async function presentPaywall(): Promise<boolean> {
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

const checkSubscription = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (typeof customerInfo.entitlements.active["pro"] !== "undefined") {
      // Grant user "pro" access
    }
  } catch (e) {
    console.error(e);
  }
};

const revenuecatProjectAppleApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_PROJECT_APPLE_API_KEY;
// const revenuecatProjectGoogleApiKey =
//   process.env.EXPO_PUBLIC_REVENUECAT_PROJECT_GOOGLE_API_KEY;

export default function SubscriptionPage() {
  const router = useRouter();

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === "ios" && revenuecatProjectAppleApiKey) {
      Purchases.configure({
        apiKey: revenuecatProjectAppleApiKey,
      });
    }
    // else if (Platform.OS === "android" && revenuecatProjectGoogleApiKey) {
    //   Purchases.configure({
    //     apiKey: revenuecatProjectGoogleApiKey,
    //   });
    // }

    presentPaywall();
  }, []);

  return (
    <View className="flex-1">
      <RevenueCatUI.Paywall
        onDismiss={() => {
          // Dismiss the paywall, i.e. remove the view, navigate to another screen, etc.
          // Will be called when the close button is pressed (if enabled) or when a purchase succeeds.
          router.back();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPurchaseCompleted={() => {
          router.back();
          toast.success("Subscription purchased successfully");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onPurchaseError={() => {
          router.back();
          toast.error("Subscription purchase failed. Please try again.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }}
        onPurchaseCancelled={() => {
          router.back();
          toast.warning("Subscription purchase cancelled");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
      />
    </View>
  );
}
