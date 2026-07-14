import { Stack } from "expo-router";
import IngredientDeleteButton from "~/components/Ingredient/IngredientDeleteButton";

export function ScreenGroupIngredient() {
  return (
    <>
      <Stack.Screen
        name="ingredient/[ingredientId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => <IngredientDeleteButton />,
        }}
      />
      <Stack.Screen
        name="ingredient/(create)"
        options={{ presentation: "card", headerShown: false }}
      />
    </>
  );
}
