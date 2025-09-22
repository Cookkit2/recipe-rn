import { Stack } from "expo-router";
import React from "react";
import { RecipeDetailProvider } from "~/store/RecipeDetailContext";

export default function RecipeIdLayout() {
  return (
    <RecipeDetailProvider>
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
            presentation: "card",
            headerShown: false,
          }}
        />
      </Stack>
    </RecipeDetailProvider>
  );
}
