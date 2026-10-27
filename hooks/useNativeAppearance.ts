import { useEffect, useLayoutEffect } from "react";
import { AppState, Appearance, Platform } from "react-native";
import { useUniwind } from "uniwind";

const useAppearanceEffect = Platform.OS === "web" ? useEffect : useLayoutEffect;

/** Keep native toolbars, glass and system dialogs aligned with the in-app theme. */
export function useNativeAppearance() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  useAppearanceEffect(() => {
    if (Platform.OS === "web") return;
    const syncAppearance = () =>
      Appearance.setColorScheme(hasAdaptiveThemes ? "auto" : theme === "dark" ? "dark" : "light");

    syncAppearance();
    // Reapply to the active window after a system sheet or a background launch.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") syncAppearance();
    });
    return () => subscription.remove();
  }, [theme, hasAdaptiveThemes]);
}
