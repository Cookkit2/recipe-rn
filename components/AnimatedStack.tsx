import { Stack } from "expo-router";
import useColors from "~/hooks/useColor";
import { useNotificationHandlers } from "~/hooks/useNotificationHandlers";
import { useOnboardingCheck } from "~/hooks/useOnboardingCheck";
import { getPantryScreens } from "~/components/navigation/ScreenGroupPantry";
import { getIngredientScreens } from "~/components/navigation/ScreenGroupIngredient";
import { getRecipeScreens } from "~/components/navigation/ScreenGroupRecipe";
import { getProfileScreens } from "~/components/navigation/ScreenGroupProfile";
import { getMiscScreens } from "~/components/navigation/ScreenGroupMisc";

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

  // Expo Router requires direct Screen children; unwrap the grouping fragments.
  return (
    <Stack>
      {/* ======== PANTRY ======== */}
      {getPantryScreens().props.children}

      {/* ======== INGREDIENT ======== */}
      {getIngredientScreens().props.children}

      {/* ======== RECIPE ======== */}
      {getRecipeScreens({ colors }).props.children}

      {/* ======== PROFILE ======== */}
      {getProfileScreens({ commonHeaderOptions }).props.children}

      {/* ======== MISCELLANOUS ======== */}
      {getMiscScreens({ commonHeaderOptions }).props.children}
    </Stack>
  );
}
