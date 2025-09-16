import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Card, CardContent } from "~/components/ui/card";
import { storage } from "~/data";
import { useColorScheme } from "~/hooks/useColorScheme";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { H4 } from "../ui/typography";
import type { GroupButton } from "../Shared/SegmentedButtons";
import SegmentedButtons from "../Shared/SegmentedButtons";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-nativewind";

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
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    storage.get("color-scheme") || "system"
  );

  const { isDarkColorScheme, setColorScheme } = useColorScheme();

  const handleSelectTheme = useCallback(
    (scheme: "light" | "dark" | "system") => {
      // Only set the scheme here; update system UI in an effect after mount.
      setCurrentTheme(scheme);
      setColorScheme(scheme);
      storage.set("color-scheme", scheme);
      setAndroidNavigationBar(isDarkColorScheme ? "light" : "dark");
    },
    [isDarkColorScheme, setColorScheme]
  );

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <H4 className="font-urbanist-bold">Appearance</H4>
        </View>
        <SegmentedButtons
          buttons={THEME_BUTTONS}
          value={currentTheme}
          onValueChange={handleSelectTheme}
        />
      </CardContent>
    </Card>
  );
}
