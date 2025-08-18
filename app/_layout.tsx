import "~/global.css";
import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { OverlayProvider } from "~/components/Overlay/OverlayContext";
import { Image } from "expo-image";
import { dummyRecipesData } from "~/data/dummy-recipes";
import { Toaster } from "sonner-native";
import * as SplashScreen from "expo-splash-screen";
export { ErrorBoundary } from "expo-router";
import { useFonts } from "expo-font";

// const LIGHT_THEME: Theme = {
//   ...DefaultTheme,
//   colors: NAV_THEME.light,
// };
// const DARK_THEME: Theme = {
//   ...DarkTheme,
//   colors: NAV_THEME.dark,
// };

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
  // const router = useRouter();
  // useEffect(() => {
  //   setTimeout(() => {
  //     router.push("/recipes");
  //     // router.push("/recipes/chicken-stir-fry/steps");
  //   }, 0);
  // }, [router]);

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
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
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
          {/* <Stack.Screen
            name="recipes"
            options={{
              headerShown: false,
              presentation: "card",
              animation: "fade",
            }}
          /> */}
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
            name="profile/index"
            options={{
              presentation: "card",
              headerShown: false,
              // header: (props) => <Header title="Profile" />,
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
          <Stack.Screen
            name="onboarding/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/step1"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/step2"
            options={{ headerShown: false }}
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  usePlatformSpecificSetup();
  const { isDarkColorScheme } = useColorScheme();

  // Comment out this block in development build
  // Font are loaded in app.json
  const [loaded, error] = useFonts({
    "bowlby-one": require("~/assets/fonts/BowlbyOne-Regular.ttf"),
    "urbanist-thin": require("~/assets/fonts/Urbanist-Thin.ttf"),
    "urbanist-extralight": require("~/assets/fonts/Urbanist-ExtraLight.ttf"),
    "urbanist-light": require("~/assets/fonts/Urbanist-Light.ttf"),
    "urbanist-regular": require("~/assets/fonts/Urbanist-Regular.ttf"),
    "urbanist-medium": require("~/assets/fonts/Urbanist-Medium.ttf"),
    "urbanist-semibold": require("~/assets/fonts/Urbanist-SemiBold.ttf"),
    "urbanist-bold": require("~/assets/fonts/Urbanist-Bold.ttf"),
    "urbanist-extrabold": require("~/assets/fonts/Urbanist-ExtraBold.ttf"),
    "urbanist-black": require("~/assets/fonts/Urbanist-Black.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    Image.prefetch([
      ...dummyRecipesData.map((recipe) => recipe.imageUrl),
      // Add your common image URLs here
      "path-to-netflix-icon.png",
      "path-to-netflix-outline.png",
    ]);
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-background">
      <RootScaleProvider>
        <SafeAreaProvider>
          <OverlayProvider>
            <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
            <AnimatedStack />
            <PortalHost />
            <Toaster />
          </OverlayProvider>
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
