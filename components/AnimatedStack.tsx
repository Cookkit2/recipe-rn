import { Stack } from "expo-router";
import useColors from "~/hooks/useColor";
import { useNotificationHandlers } from "~/hooks/useNotificationHandlers";
import { useOnboardingCheck } from "~/hooks/useOnboardingCheck";
import { ScreenGroupPantry } from "~/components/navigation/ScreenGroupPantry";
import { ScreenGroupIngredient } from "~/components/navigation/ScreenGroupIngredient";
import { ScreenGroupRecipe } from "~/components/navigation/ScreenGroupRecipe";
import { ScreenGroupProfile } from "~/components/navigation/ScreenGroupProfile";
import { ScreenGroupMisc } from "~/components/navigation/ScreenGroupMisc";

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
      {ScreenGroupPantry()}

      {/* ======== INGREDIENT ======== */}
      {ScreenGroupIngredient()}

      {/* ======== RECIPE ======== */}
      {ScreenGroupRecipe({ colors })}

      {/* ======== PROFILE ======== */}
      {ScreenGroupProfile({ commonHeaderOptions })}

      {/* ======== MISCELLANOUS ======== */}
      {ScreenGroupMisc({ commonHeaderOptions })}
    </Stack>
  );
}
