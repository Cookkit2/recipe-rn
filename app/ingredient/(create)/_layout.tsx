import React from "react";
import { Stack } from "expo-router";
import { CreateIngredientProvider } from "~/store/CreateIngredientContext";
import useColors from "~/hooks/useColor";
import { APP_HEADER_APPEARANCE } from "~/components/navigation/native-header-appearance";

export default function CreateIngredientLayout() {
  const colors = useColors();
  return (
    <CreateIngredientProvider>
      <Stack screenOptions={{ ...APP_HEADER_APPEARANCE, headerShown: false }}>
        <Stack.Screen
          name="create"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="voice"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="confirmation"
          options={{
            presentation: "card",
            headerShown: true,
            headerTransparent: true,
            headerTitle: "Confirmation",
            headerLargeTitleEnabled: true,
            headerLargeTitleStyle: {
              fontFamily: "BowlbyOne-Regular",
              fontSize: 28,
              fontWeight: "bold",
              color: colors.foreground.toString(),
            },
            headerTitleStyle: {
              fontFamily: "BowlbyOne-Regular",
            },
            headerTintColor: colors.foreground.toString(),
            headerBackButtonDisplayMode: "minimal",
          }}
        />
      </Stack>
    </CreateIngredientProvider>
  );
}
