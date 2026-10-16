import { Stack } from "expo-router";
import React from "react";

export default function MealPlanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
