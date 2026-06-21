import "~/global.css";
import React, { useEffect, useMemo } from "react";
import { useNavigationContainerRef } from "expo-router";
import { Platform, View } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";
export { ErrorBoundary } from "expo-router";
import { QueryProvider } from "~/store/QueryProvider";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { storage } from "~/data";
import { PREF_COLOR_SCHEME_KEY } from "~/constants/storage-keys";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
} from "react-native-purchases";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { isRunningInExpoGo } from "expo";
import { Uniwind } from "uniwind";

import * as Sentry from "@sentry/react-native";
import { initImageCache } from "~/lib/image-cache";
import { AuthProvider, MockAuthStrategy, SupabaseAuthStrategy } from "~/auth";
import { TEST_IDS } from "~/constants/test-ids";
import { IS_E2E } from "~/utils/e2e-flags";
import { invalidateSubscriptionEntitlementsQuery } from "~/lib/subscription-query-sync";
import { AnimatedStack } from "~/components/AnimatedStack";
import { NotificationProvider } from "~/lib/notifications";
import { AIAssistantProvider } from "~/lib/function-gemma/AIAssistantContext";
import { getInstallAnchor } from "~/lib/install-anchor";
import {
  diffCustomerInfo,
  emitAppFirstOpen,
  emitFunnelEvent,
  emitSessionStart,
} from "~/lib/analytics/funnel-events";
const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

/**
 * Previous CustomerInfo snapshot, used by the customerInfoUpdateListener to
 * diff entitlement transitions (cancel / refund / activation) for funnel
 * analytics (issue #718). Module-scoped because the listener is registered
 * once on idle init and must remember state across its callbacks.
 */
let prevCustomerInfo: CustomerInfo | null = null;

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: (process.env.EXPO_PUBLIC_SENTRY_DSN ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN) as string | undefined,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii:
    (process.env.EXPO_PUBLIC_SENTRY_SEND_PII ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_SEND_PII) === "true",

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  usePlatformSpecificSetup();

  const authStrategy = useMemo(
    () =>
      IS_E2E
        ? new MockAuthStrategy({
            delay: 50,
            preloadUsers: [{ email: "e2e@example.com", password: "ValidPassword123!" }],
          })
        : new SupabaseAuthStrategy(),
    []
  );

  // Register the navigation container with Sentry for automatic route tracking
  const ref = useNavigationContainerRef();

  useEffect(() => {
    initImageCache();

    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }

    // Materialize the Day-0 install anchor (issue #718). Lazily persists an
    // anonymous installId + installAnchorTs on first launch; no-op after that.
    // E2E runs keep the analytics path but it safely no-ops through the sinks.
    getInstallAnchor();

    // Day-0 funnel signals: first-open fires only on the install that creates
    // the anchor (the E2E/Detox build re-uses a stored anchor so it does not
    // re-emit). session_start fires every cold launch.
    const anchor = getInstallAnchor();
    if (Date.now() - anchor.installAnchorTs < 5_000) {
      emitAppFirstOpen();
    }
    emitSessionStart();

    // Restore persisted theme from MMKV on mount
    const storedTheme = storage.get<"light" | "dark" | "system">(PREF_COLOR_SCHEME_KEY);
    if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
      Uniwind.setTheme(storedTheme);
    }
  }, [ref]);

  // Defer RevenueCat initialization until the JS thread is idle
  useEffect(() => {
    let customerInfoListener: CustomerInfoUpdateListener | undefined;

    const handle = requestIdleCallback(() => {
      Purchases.setLogLevel(LOG_LEVEL.ERROR);

      const appleApiKey =
        process.env.EXPO_PUBLIC_REVENUECAT_PROJECT_APPLE_API_KEY ||
        Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_PROJECT_APPLE_API_KEY;

      const googleApiKey =
        process.env.EXPO_PUBLIC_REVENUECAT_PROJECT_GOOGLE_API_KEY ||
        Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_PROJECT_GOOGLE_API_KEY;

      if (Platform.OS === "ios" && appleApiKey) {
        Purchases.configure({ apiKey: appleApiKey });
      } else if (Platform.OS === "android" && googleApiKey) {
        Purchases.configure({ apiKey: googleApiKey });
      } else {
        return;
      }

      customerInfoListener = (customerInfo: CustomerInfo) => {
        // Diff against the previously seen CustomerInfo to derive funnel
        // transitions (entitlement_changed / paid_converted / cancel /
        // refund / Day-0 cancel) per issue #718. Each emit() is wrapped in
        // try/catch internally so analytics cannot break this listener.
        try {
          const anchor = getInstallAnchor();
          for (const evt of diffCustomerInfo(prevCustomerInfo, customerInfo, anchor)) {
            emitFunnelEvent(
              evt.type,
              evt.triggerSource ? { triggerSource: evt.triggerSource } : {}
            );
          }
        } catch {
          /* analytics must never break the entitlement cache invalidation */
        }
        prevCustomerInfo = customerInfo;
        invalidateSubscriptionEntitlementsQuery();
      };
      Purchases.addCustomerInfoUpdateListener(customerInfoListener);
    });

    return () => {
      cancelIdleCallback(handle);
      if (customerInfoListener) {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView className="flex-1 bg-background">
      <View testID={TEST_IDS.appRoot} collapsable={false} style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider strategy={authStrategy} autoInitialize={true}>
              <AIAssistantProvider>
                <NotificationProvider>
                <KeyboardProvider>
                  <StatusBar style="auto" />
                  <AnimatedStack />
                  <Toaster visibleToasts={2} position="bottom-center" offset={80} />
                  <PortalHost />
                </KeyboardProvider>
              </NotificationProvider>
              </AIAssistantProvider>
            </AuthProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
});

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add("bg-background");
  }, []);
}

function useSetAndroidNavigationBar() {
  React.useLayoutEffect(() => {
    setAndroidNavigationBar("light");
  }, []);
}

function noop() {}
