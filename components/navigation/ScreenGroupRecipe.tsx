import { Stack } from "expo-router";
import RecipeHeaderActions from "~/components/Recipe/Details/RecipeHeaderActions";

export function getRecipeScreens({ colors }: { colors: { foreground: string } }) {
  return [
    <Stack.Screen
      key="recipes/favorites"
      name="recipes/favorites"
      options={{
        presentation: "card",
        headerShown: true,
        headerTransparent: true,
        headerTitle: "Favorites",
        headerLargeTitleEnabled: true,
        headerLargeTitleStyle: {
          fontFamily: "BowlbyOne-Regular",
          fontSize: 28,
          fontWeight: "bold",
          color: colors.foreground,
        },
        headerTitleStyle: {
          fontFamily: "BowlbyOne-Regular",
        },
        headerTintColor: colors.foreground,
        headerBackButtonDisplayMode: "minimal",
      }}
    />,
    <Stack.Screen
      key="recipes/[recipeId]"
      name="recipes/[recipeId]"
      options={{
        presentation: "card",
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#fff",
        headerRight: () => <RecipeHeaderActions />,
      }}
    />,
    <Stack.Screen
      key="(misc)/import-youtube"
      name="(misc)/import-youtube"
      options={{
        presentation: "card",
        headerShown: true,
        headerTransparent: true,
        headerTitle: "Create Recipe",
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.foreground,
      }}
    />,
  ];
}
