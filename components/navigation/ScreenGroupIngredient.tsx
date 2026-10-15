import { Stack } from "expo-router";
import IngredientDeleteButton from "~/components/Ingredient/IngredientDeleteButton";

export function getIngredientScreens() {
  return [
    <Stack.Screen
      key="ingredient/[ingredientId]"
      name="ingredient/[ingredientId]"
      options={{
        presentation: "card",
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <IngredientDeleteButton />,
      }}
    />,
    <Stack.Screen
      key="ingredient/(create)"
      name="ingredient/(create)"
      options={{ presentation: "card", headerShown: false }}
    />,
  ];
}
