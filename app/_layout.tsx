import "~/global.css";
import React, { useEffect, useRef, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { Appearance, Platform, View } from "react-native";
import { useColorScheme } from "~/hooks/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
} from "react-native-reanimated";
import { RootScaleProvider, useRootScale } from "~/store/RootScaleContext";
import { BlurView } from "expo-blur";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { dummyRecipesData } from "~/data/dummy/dummy-recipes";
import { Toaster } from "sonner-native";
export { ErrorBoundary } from "expo-router";
import { SystemBars } from "react-native-edge-to-edge";
import { QueryProvider } from "~/store/QueryProvider";
import { AuthProvider, SupabaseAuthStrategy } from "~/auth";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { createMMKVStorage } from "~/data/storage";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function AnimatedStack() {
  const { scale } = useRootScale();

  const [isModalActive, setIsModalActive] = useState(false);
  const [canBlur, setCanBlur] = useState(false);
  const { isDarkColorScheme } = useColorScheme();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        {
          translateY: (1 - scale.value) * -150,
        },
      ],
    };
  });

  // For ease of dev, we can redirect to the steps page
  const router = useRouter();
  useEffect(() => {
    if (__DEV__) {
      setTimeout(() => {
        const completed = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);
        console.log("Onboarding completed:", completed);
        if (completed !== true) {
          router.replace("/onboarding");
        }
        // router.push("/profile/preferences");
        // router.push("/ingredient/webview");
        // router.push("/ingredient/confirmation");
        // router.push("/recipes/chicken-stir-fry/steps");
      }, 0);
    }
  }, [router]);

  return (
    <View className="flex-1 bg-background">
      {isModalActive && canBlur && (
        <AnimatedBlurView
          entering={FadeIn.springify().mass(0.5).damping(15).stiffness(150)}
          exiting={FadeOut.springify().mass(0.5).damping(15).stiffness(150)}
          intensity={50}
          className="absolute inset-0 z-[1]"
          tint={isDarkColorScheme ? "dark" : "light"}
        />
      )}
      <Animated.View
        className="flex-1 overflow-hidden rounded-sm"
        style={[animatedStyle]}
      >
        <Stack>
          {/* ======== PANTRY ======== */}
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />

          {/* ======== INGREDIENT ======== */}
          <Stack.Screen
            name="ingredient/[ingredientId]"
            options={{
              headerShown: false,
              presentation: "transparentModal",
              contentStyle: { backgroundColor: "transparent" },
            }}
            listeners={{
              focus: () => {
                if (Platform.OS === "ios") {
                  setIsModalActive(true);
                  setCanBlur(true);
                }
              },
              beforeRemove: () => {
                if (Platform.OS === "ios") {
                  setIsModalActive(false);
                  setCanBlur(false);
                }
              },
            }}
          />
          <Stack.Screen
            name="ingredient/(create)"
            options={{ presentation: "card", headerShown: false }}
          />

          {/* ======== RECIPE ======== */}
          <Stack.Screen
            name="recipes/[recipeId]/index"
            options={{ presentation: "card", headerShown: false }}
          />
          <Stack.Screen
            name="recipes/[recipeId]/steps"
            options={{ presentation: "card", headerShown: false }}
          />

          {/* ======== PROFILE ======== */}
          <Stack.Screen
            name="profile/index"
            options={{ presentation: "card", headerShown: false }}
          />
          <Stack.Screen
            name="profile/preferences/index"
            options={{ presentation: "card", headerShown: false }}
          />
          <Stack.Screen
            name="profile/preferences/dietary-preference"
            options={{ presentation: "card", headerShown: false }}
          />
          <Stack.Screen
            name="profile/preferences/allergy"
            options={{ presentation: "card", headerShown: false }}
          />

          {/* ======== MISCELLANOUS ======== */}
          <Stack.Screen
            name="misc/terms"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen
            name="misc/privacy"
            options={{ presentation: "modal", headerShown: false }}
          />

          {/* ======== ONBOARDING ======== */}
          <Stack.Screen
            name="onboarding/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/tutorial"
            options={{ headerShown: false }}
          />
          {/* ======== ONBOARDING PREFERENCES ======== */}
          <Stack.Screen
            name="onboarding-pref/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding-pref/appliances"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding-pref/allergy"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding-pref/dietary-preference"
            options={{ headerShown: false }}
          />

          {/* ======== SUBSCRIPTION ======== */}
          <Stack.Screen
            name="subscription/index"
            options={{ presentation: "containedModal", headerShown: false }}
          />

          <Stack.Screen name="debug" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </Animated.View>
    </View>
  );
}

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  usePlatformSpecificSetup();

  // TODO: fetch all recipes images
  useEffect(() => {
    Image.prefetch([...dummyRecipesData.map((recipe) => recipe.imageUrl)]);
    createMMKVStorage(); // Initialize MMKV storage
  }, []);

  // useModelPreloader({
  //   delay: 200,
  //   priority: "low",
  //   // onLoadComplete: () => {
  //   //   if (__DEV__) console.log("Models ready for use!");
  //   // },
  // });

  return (
    <GestureHandlerRootView className="flex-1 bg-background">
      <RootScaleProvider>
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider
              strategy={new SupabaseAuthStrategy()}
              autoInitialize={true}
            >
              <KeyboardProvider>
                <SystemBars style="auto" />
                <AnimatedStack />
                <PortalHost />
                <Toaster />
              </KeyboardProvider>
            </AuthProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </RootScaleProvider>
    </GestureHandlerRootView>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add("bg-background");
  }, []);
}

function useSetAndroidNavigationBar() {
  React.useLayoutEffect(() => {
    setAndroidNavigationBar(Appearance.getColorScheme() ?? "light");
  }, []);
}

function noop() {}
