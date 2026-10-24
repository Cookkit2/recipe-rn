import { useEffect } from "react";
import { Appearance, Platform } from "react-native";
import { useUniwind } from "uniwind";

/** Keep native toolbars, glass and system dialogs aligned with the in-app theme. */
export function useNativeAppearance() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  useEffect(() => {
    if (Platform.OS === "web") return;
    Appearance.setColorScheme(hasAdaptiveThemes ? "auto" : theme === "dark" ? "dark" : "light");
  }, [theme, hasAdaptiveThemes]);
}
