import "~/global.css";
import React, { useEffect, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  type Theme,
} from "@react-navigation/native";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Appearance, Platform, View } from "react-native";
import { NAV_THEME } from "~/constants/colors";
import { useColorScheme } from "~/hooks/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
// import { ThemeToggle } from "~/components/ThemeToggle";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SheetProvider } from "react-native-sheet-transitions";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import {
  RootScaleProvider,
  useRootScale,
} from "~/store/context/RootScaleContext";
import { BlurView } from "expo-blur";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { OverlayProvider } from "~/components/Overlay/OverlayContext";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { createMMKVStorage, storageFacade } from "~/data/storage";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { dummyRecipesData } from "~/data/dummy-recipes";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export { ErrorBoundary } from "expo-router";

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
    setTimeout(() => {
      router.push("/onboarding");
    }, 0);
  }, [router]);

  return (
    <View className="flex-1 bg-background">
      {isModalActive && canBlur && (
        <BlurView
          intensity={50}
          className="absolute inset-0 z-1"
          tint={isDarkColorScheme ? "dark" : "light"}
        />
      )}
      <Animated.View
        className="flex-1 overflow-hidden rounded-sm"
        style={[animatedStyle]}
      >
        <Stack>
          <Stack.Screen
            name="onboarding/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(ingredient)/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(ingredient)/[ingredientId]"
            options={{
              headerShown: false,
              presentation: "transparentModal",
              contentStyle: { backgroundColor: "transparent" },
            }}
            listeners={{
              focus: () => {
                setIsModalActive(true);
                setCanBlur(true);
              },
              beforeRemove: () => {
                setIsModalActive(false);
                setCanBlur(false);
              },
            }}
          />
          <Stack.Screen
            name="(ingredient)/create"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen
            name="recipes"
            options={{
              headerShown: false,
              animation: "none",
              presentation: "containedTransparentModal",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          <Stack.Screen
            name="recipes/[recipeId]/index"
            options={{
              presentation: "card",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="recipes/[recipeId]/steps"
            options={{
              presentation: "card",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="misc/terms"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="misc/privacy"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
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

export default function RootLayout() {
  usePlatformSpecificSetup();
  const { isDarkColorScheme } = useColorScheme();
  // const router = useRouter();
  // const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    Image.prefetch([
      ...dummyRecipesData.map((recipe) => recipe.imageUrl),
      // Add your common image URLs here
      "path-to-netflix-icon.png",
      "path-to-netflix-outline.png",
    ]);
  }, []);

  // useEffect(() => {
  //   let mounted = true;
  //   const init = async () => {
  //     try {
  //       await SplashScreen.preventAutoHideAsync();
  //     } catch {
  //       /* noop */
  //     }
  //     try {
  //       createMMKVStorage({ id: "app" });
  //       const completed = storageFacade.get<boolean>(ONBOARDING_COMPLETED_KEY);
  //       if (!completed) {
  //         router.replace("/onboarding");
  //       }
  //     } finally {
  //       if (mounted) setAppReady(true);
  //       try {
  //         await SplashScreen.hideAsync();
  //       } catch {
  //         /* noop */
  //       }
  //     }
  //   };
  //   init();
  //   return () => {
  //     mounted = false;
  //   };
  // }, [router]);

  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      {/* <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}> */}
        <SheetProvider>
          <RootScaleProvider>
            <SafeAreaProvider>
              <OverlayProvider>
                <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
                <AnimatedStack />
                <PortalHost />
              </OverlayProvider>
            </SafeAreaProvider>
          </RootScaleProvider>
        </SheetProvider>
      {/* </ThemeProvider> */}
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
