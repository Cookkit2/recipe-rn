// @ts-nocheck
import React, { useCallback } from "react";
import { View } from "react-native";
import { Card, CardContent } from "~/components/ui/card";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { H4 } from "~/components/ui/typography";
import type { GroupButton } from "~/components/Shared/SegmentedButtons";
import SegmentedButtons from "~/components/Shared/SegmentedButtons";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-uniwind";
import { Uniwind, useUniwind } from "uniwind";
import { storage } from "~/data";
import { PREF_COLOR_SCHEME_KEY } from "~/constants/storage-keys";

type Theme = "light" | "dark" | "system";

const THEME_BUTTONS: GroupButton<Theme>[] = [
  {
    label: "Light",
    icon: <SunIcon />,
    value: "light",
  },
  {
    label: "Dark",
    icon: <MoonIcon />,
    value: "dark",
  },
  {
    label: "System",
    icon: <MonitorIcon />,
    value: "system",
  },
];

export default function ThemeSection() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const themePreference = hasAdaptiveThemes ? "system" : theme;

  const handleSelectTheme = useCallback(
    (scheme: "light" | "dark" | "system") => {
      // Persist to MMKV and update UI
      storage.set(PREF_COLOR_SCHEME_KEY, scheme);
      Uniwind.setTheme(scheme);
      // @ts-expect-error
      setAndroidNavigationBar(theme);
    },
    [theme]
  );

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <H4 className="font-urbanist-bold">Appearance</H4>
        </View>
        <SegmentedButtons
          buttons={THEME_BUTTONS}
          // @ts-expect-error
          value={themePreference}
          onValueChange={handleSelectTheme}
        />
      </CardContent>
    </Card>
  );
}
