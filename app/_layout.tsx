import "~/global.css";
import React, { useEffect } from "react";
import { Link, SplashScreen, Stack, useNavigationContainerRef, useRouter } from "expo-router";
import { Platform } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";
export { ErrorBoundary } from "expo-router";
import { QueryProvider } from "~/store/QueryProvider";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY, PREF_COLOR_SCHEME_KEY } from "~/constants/storage-keys";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { isRunningInExpoGo } from "expo";
import { Uniwind, useUniwind } from "uniwind";
import AddToPlanHeaderButton from "~/components/Recipe/Details/AddToPlanHeaderButton";
import IngredientDeleteButton from "~/components/Ingredient/IngredientDeleteButton";
import useColors from "~/hooks/useColor";
import * as Sentry from "@sentry/react-native";
import { H1 } from "~/components/ui/typography";
import {
  NotificationProvider,
  registerNotificationHandler,
  unregisterNotificationHandler,
  extractNotificationData,
  ACHIEVEMENT_UNLOCKED_TYPE,
  CHALLENGE_COMPLETED_TYPE,
  INGREDIENT_EXPIRY_TYPE,
} from "~/lib/notifications";
import { initImageCache } from "~/lib/image-cache";

function AnimatedStack() {
  const { theme } = useUniwind();
  const headerColor = theme === "dark" ? "#fff" : "#000";
  const router = useRouter();
  const colors = useColors();

  // const [isModalActive, setIsModalActive] = useState(false);
  // const [canBlur, setCanBlur] = useState(false);

  // Register the navigation container with Sentry for automatic route tracking
  const ref = useNavigationContainerRef();

  // Hide splash screen once the navigation stack is mounted
  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  // Single handler for ingredient_expiry: deep link to first recipe or pantry
  useEffect(() => {
    registerNotificationHandler(INGREDIENT_EXPIRY_TYPE, (response) => {
      const data = extractNotificationData(response);
      const recipeIds = data?.recipeIds as string[] | undefined;
      if (recipeIds && recipeIds.length > 0) {
        router.push(`/recipes/${recipeIds[0]}`);
      } else {
        router.push("/");
      }
    });

    return () => {
      unregisterNotificationHandler(INGREDIENT_EXPIRY_TYPE);
    };
  }, [router]);

  useEffect(() => {
    registerNotificationHandler(ACHIEVEMENT_UNLOCKED_TYPE, () => {
      router.push("/profile/achievements");
    });

    return () => {
      unregisterNotificationHandler(ACHIEVEMENT_UNLOCKED_TYPE);
    };
  }, [router]);

  useEffect(() => {
    registerNotificationHandler(CHALLENGE_COMPLETED_TYPE, () => {
      router.push("/profile/achievements");
    });

    return () => {
      unregisterNotificationHandler(CHALLENGE_COMPLETED_TYPE);
    };
  }, [router]);

  // Check onboarding status on mount
  useEffect(() => {
    // router.push("/profile/preferences/voice-settings");
    setTimeout(() => {
      const completed = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);
      if (completed !== true) {
        router.replace("/onboarding");
      }
      SplashScreen.hideAsync();
    }, 0);
  }, [router]);

  return (
    <Stack>
      {/* ======== PANTRY ======== */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          unstable_headerLeftItems() {
            return [
              {
                type: "custom",
                hidesSharedBackground: true,
                element: <H1 className="font-bowlby-one pt-5 pb-2">Pantry</H1>,
              },
            ];
          },
          // headerLargeTitleEnabled: true,
          // headerLargeTitleStyle: {
          //   fontFamily: "BowlbyOne-Regular",
          //   fontSize: 30,
          //   fontWeight: "bold",
          //   color: headerColor,
          // },
          // headerTitleStyle: {
          //   fontFamily: "BowlbyOne-Regular",
          // },
          // unstable_headerRightItems() {
          //   return [
          //     {
          //       type: "custom",
          //       element: (
          //         <Link href="/ingredient/create" asChild className="mx-2">
          //           <PlusIcon className="text-foreground" strokeWidth={2.618} />
          //         </Link>
          //       ),
          //     },
          //     {
          //       type: "custom",
          //       element: (
          //         <Link href="/profile" asChild className="mx-2">
          //           <UserIcon className="text-foreground" strokeWidth={2.618} />
          //         </Link>
          //       ),
          //     },
          //   ];
          // },
        }}
      />
      {/* ======== INGREDIENT ======== */}
      <Stack.Screen
        name="ingredient/[ingredientId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          // headerTintColor: "#fff",
          headerRight: () => <IngredientDeleteButton />,
        }}
      />
      <Stack.Screen
        name="ingredient/(create)"
        options={{ presentation: "card", headerShown: false }}
      />
      {/* ======== RECIPE ======== */}
      <Stack.Screen
        name="recipes/[recipeId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#fff",
          headerRight: () => <AddToPlanHeaderButton />,
        }}
      />
      <Stack.Screen
        name="import-youtube"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Create Recipe",
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: colors.foreground,
        }}
      />

      {/* ======== PROFILE ======== */}
      <Stack.Screen
        name="profile/index"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Profile",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/cooked-recipes"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Cooked Recipes",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/analytics"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Analytics",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/achievements"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Achievements",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/notification"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Notification",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/preferences/index"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Preferences",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/preferences/dietary-preference"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Dietary Preference",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/preferences/allergy"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Food Allergies",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="profile/preferences/voice-settings"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Voice Settings",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      {/* ======== ONBOARDING ======== */}
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding/tutorial"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          // headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="preferences/index"
        options={{ presentation: "modal", headerShown: false }}
      />
      {/* ======== GROCERY LIST ======== */}
      <Stack.Screen
        name="grocery-list/index"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Grocery List",
          headerLargeTitleEnabled: true,
          headerLargeTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
            fontSize: 28,
            fontWeight: "bold",
            color: colors.foreground,
          },
          headerTitleStyle: {
            fontFamily: "BowlbyOne-Regular",
          },
          headerTintColor: colors.foreground,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      {/* ======== SEARCH ======== */}
      <Stack.Screen
        name="search"
        options={{
          headerShown: false,
          headerTransparent: true,
          headerTitle: "",
          presentation: "card",
          animation: "fade",
          animationDuration: 100,
          headerBackVisible: false,
        }}
      />
      {/* ======== MISCELLANOUS ======== */}
      <Stack.Screen name="debug" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

const sentryDsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN || Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN;
const sentrySendPii =
  process.env.EXPO_PUBLIC_SENTRY_SEND_PII === "true" ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_SEND_PII === true;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: sentrySendPii,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
    enableAutoSessionTracking: true,
    enableAutoPerformanceTracing: true,
    enableUserInteractionTracing: true,
    enableLogs: true,
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
  });
} else if (!__DEV__) {
  console.warn(
    "[Sentry] EXPO_PUBLIC_SENTRY_DSN not set; error reporting disabled. Set in .env or app.json extra for production."
  );
}

export default Sentry.wrap(function RootLayout() {
  usePlatformSpecificSetup();
  const router = useRouter();

  // Register the navigation container with Sentry for automatic route tracking
  const ref = useNavigationContainerRef();

  useEffect(() => {
    initImageCache();

    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }

    // Restore persisted theme from MMKV on mount
    const storedTheme = storage.get<"light" | "dark" | "system">(PREF_COLOR_SCHEME_KEY);
    if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
      Uniwind.setTheme(storedTheme);
    }
  }, []);

  // Defer RevenueCat initialization until the JS thread is idle
  useEffect(() => {
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
      }
    });

    return () => cancelIdleCallback(handle);
  }, []);

  return (
    <GestureHandlerRootView className="flex-1 bg-background">
      <SafeAreaProvider>
        <QueryProvider>
          {/* <AuthProvider
              strategy={new SupabaseAuthStrategy()}
              autoInitialize={true}
            > */}
          <NotificationProvider>
            <KeyboardProvider>
              <StatusBar style="auto" />
              <AnimatedStack />
              <Toaster visibleToasts={2} position="bottom-center" offset={80} />
              <PortalHost />
            </KeyboardProvider>
          </NotificationProvider>
          {/* </AuthProvider> */}
        </QueryProvider>
      </SafeAreaProvider>
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
