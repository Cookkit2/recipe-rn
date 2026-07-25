import { Stack } from "expo-router";
import type { ComponentProps } from "react";

export function ScreenGroupMisc({
  commonHeaderOptions,
}: {
  commonHeaderOptions: ComponentProps<typeof Stack.Screen>["options"];
}) {
  return (
    <>
      {/* ======== ONBOARDING ======== */}
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding/tutorial"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
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
        options={{ ...commonHeaderOptions, headerTitle: "Grocery List" }}
      />
      {/* ======== SEARCH ======== */}
      <Stack.Screen
        name="(misc)/search"
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
      <Stack.Screen name="(misc)/debug" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </>
  );
}
