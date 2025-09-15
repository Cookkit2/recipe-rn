import React from "react";
import { Stack } from "expo-router";
import { CreateIngredientProvider } from "~/store/CreateIngredientContext";

export default function CreateIngredientLayout() {
  return (
    <CreateIngredientProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="create"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="confirmation"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
      </Stack>
    </CreateIngredientProvider>
  );
}
