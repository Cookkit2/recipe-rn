import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useUniwind } from "uniwind";
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
  const { theme } = useUniwind();
  const baseTheme = theme === "dark" ? DarkTheme : DefaultTheme;
  // Native transitions expose the stack container around the rounded screens.
  // Keep that backdrop and native chrome on the same theme as the screen content.
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      primary: colors.primary,
      border: colors.border,
      notification: colors.destructive,
    },
  };

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
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerTintColor: colors.foreground }}>
        {/* ======== PANTRY ======== */}
        {getPantryScreens()}

        {/* ======== INGREDIENT ======== */}
        {getIngredientScreens()}

        {/* ======== RECIPE ======== */}
        {getRecipeScreens({ colors })}

        {/* ======== PROFILE ======== */}
        {getProfileScreens({ commonHeaderOptions })}

        {/* ======== MISCELLANOUS ======== */}
        {getMiscScreens({ commonHeaderOptions, backgroundColor: colors.background })}
      </Stack>
    </ThemeProvider>
  );
}
