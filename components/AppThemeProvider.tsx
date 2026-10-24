import { useMemo, type PropsWithChildren } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useUniwind } from "uniwind";
import useColors from "~/hooks/useColor";

/** Keep native navigation (including Liquid Glass) in the app's selected appearance. */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const { theme } = useUniwind();
  const { foreground, background, card, border, destructive } = useColors();
  const navigationTheme = useMemo(() => {
    const base = theme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: foreground,
        background,
        card,
        text: foreground,
        border,
        notification: destructive,
      },
    };
  }, [theme, foreground, background, card, border, destructive]);

  return <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>;
}
