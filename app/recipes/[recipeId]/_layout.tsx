import { Stack } from "expo-router";
import React from "react";
import { RecipeDetailProvider } from "~/store/RecipeDetailContext";
import { TimerProvider } from "~/store/TimerContext";
import useColors from "~/hooks/useColor";

export default function RecipeIdLayout() {
  const colors = useColors();
  return (
    <RecipeDetailProvider>
      <TimerProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="index"
            options={{
              presentation: "card",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="steps"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="add-to-plan"
            options={{
              presentation: "modal",
              headerShown: true,
              headerTransparent: true,
              headerBackButtonDisplayMode: "minimal",
              sheetGrabberVisible: true,
              headerTitleStyle: {
                fontFamily: "BowlbyOne-Regular",
                color: colors.foreground,
              },
            }}
          />
        </Stack>
      </TimerProvider>
    </RecipeDetailProvider>
  );
}
