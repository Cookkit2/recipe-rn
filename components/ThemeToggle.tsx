import { Pressable, View } from "react-native";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { MoonStarIcon, SunIcon } from "~/lib/icons/ThemeIcons";
import { useColorScheme } from "~/hooks/useColorScheme";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme();

  function toggleColorScheme() {
    const newTheme = isDarkColorScheme ? "light" : "dark";
    setColorScheme(newTheme);
    setAndroidNavigationBar(newTheme);
  }

  return (
    <Button
      size="icon"
      variant="secondary"
      className="rounded-full"
      onPress={toggleColorScheme}
    >
      {isDarkColorScheme ? (
        <MoonStarIcon
          className="text-foreground"
          size={20}
          strokeWidth={2.618}
        />
      ) : (
        <SunIcon className="text-foreground" size={20} strokeWidth={2.618} />
      )}
    </Button>
  );
}
