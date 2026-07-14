import { Stack } from "expo-router";
import AddToPlanHeaderButton from "~/components/Recipe/Details/AddToPlanHeaderButton";

export function ScreenGroupRecipe({ colors }: { colors: { foreground: string } }) {
  return (
    <>
      <Stack.Screen
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
      />
      <Stack.Screen
        name="recipes/[recipeId]"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#fff",
          headerRight: () => <AddToPlanHeaderButton />,
        }}
      />
      <Stack.Screen
        name="(misc)/import-youtube"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "Create Recipe",
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: colors.foreground,
        }}
      />
    </>
  );
}
