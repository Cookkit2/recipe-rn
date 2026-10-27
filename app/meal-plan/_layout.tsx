import { Stack } from "expo-router";
import React from "react";
import { APP_HEADER_APPEARANCE } from "~/components/navigation/native-header-appearance";

export default function MealPlanLayout() {
  return (
    <Stack screenOptions={{ ...APP_HEADER_APPEARANCE, headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
