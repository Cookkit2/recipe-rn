import { Stack, useRouter } from "expo-router";
import { H1 } from "~/components/ui/typography";
import useColors from "~/hooks/useColor";
import AddToPlanHeaderButton from "~/components/Recipe/Details/AddToPlanHeaderButton";
import IngredientDeleteButton from "~/components/Ingredient/IngredientDeleteButton";
import { useNotificationHandlers } from "~/hooks/useNotificationHandlers";
import { useOnboardingCheck } from "~/hooks/useOnboardingCheck";

export function AnimatedStack() {
  const colors = useColors();

  const commonHeaderOptions = {
    presentation: "card",
    headerShown: true,
    headerTransparent: true,
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
  } as const;

  // Hide splash screen once the navigation stack is mounted
  useNotificationHandlers();
  useOnboardingCheck();

  return (
    <Stack>
      {/* ======== PANTRY ======== */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          unstable_headerLeftItems() {
            return [
              {
                type: "custom",
                hidesSharedBackground: true,
                element: <H1 className="font-bowlby-one pt-5 pb-2">Pantry</H1>,
              },
            ];
          },
        }}
      />
      {/* ======== INGREDIENT ======== */}
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
      {/* ======== RECIPE ======== */}
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

      {/* ======== PROFILE ======== */}
      <Stack.Screen
        name="profile/index"
        options={{ ...commonHeaderOptions, headerTitle: "Profile" }}
      />
      <Stack.Screen
        name="profile/cooked-recipes"
        options={{ ...commonHeaderOptions, headerTitle: "Cooked Recipes" }}
      />
      <Stack.Screen
        name="profile/analytics"
        options={{ ...commonHeaderOptions, headerTitle: "Analytics" }}
      />
      <Stack.Screen
        name="profile/achievements"
        options={{ ...commonHeaderOptions, headerTitle: "Achievements" }}
      />
      <Stack.Screen
        name="profile/notification"
        options={{ ...commonHeaderOptions, headerTitle: "Notification" }}
      />
      <Stack.Screen
        name="profile/preferences/index"
        options={{ ...commonHeaderOptions, headerTitle: "Preferences" }}
      />
      <Stack.Screen
        name="profile/preferences/dietary-preference"
        options={{ ...commonHeaderOptions, headerTitle: "Dietary Preference" }}
      />
      <Stack.Screen
        name="profile/preferences/allergy"
        options={{ ...commonHeaderOptions, headerTitle: "Food Allergies" }}
      />
      <Stack.Screen
        name="profile/preferences/voice-settings"
        options={{ ...commonHeaderOptions, headerTitle: "Voice Settings" }}
      />
      {/* ======== ONBOARDING ======== */}
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding/tutorial"
        options={{
          presentation: "card",
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="preferences/index"
        options={{ presentation: "modal", headerShown: false }}
      />
      {/* ======== GROCERY LIST ======== */}
      <Stack.Screen
        name="grocery-list/index"
        options={{ ...commonHeaderOptions, headerTitle: "Grocery List" }}
      />
      {/* ======== SEARCH ======== */}
      <Stack.Screen
        name="(misc)/search"
        options={{
          headerShown: false,
          headerTransparent: true,
          headerTitle: "",
          presentation: "card",
          animation: "fade",
          animationDuration: 100,
          headerBackVisible: false,
        }}
      />
      {/* ======== MISCELLANOUS ======== */}
      <Stack.Screen name="(misc)/debug" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
