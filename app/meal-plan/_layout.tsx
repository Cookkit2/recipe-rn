import { Stack } from "expo-router";
import React from "react";
import { MealPlanCalendarProvider } from "~/store/MealPlanCalendarContext";

export default function MealPlanLayout() {
  return (
    <MealPlanCalendarProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
      </Stack>
    </MealPlanCalendarProvider>
  );
}
