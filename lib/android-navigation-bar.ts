import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import useColors from "~/hooks/useColor";

export async function setAndroidNavigationBar(theme: "light" | "dark") {
  const colors = useColors(); 
  if (Platform.OS !== "android") return;
  await NavigationBar.setButtonStyleAsync(theme);
  await NavigationBar.setBackgroundColorAsync(colors.background.toString());
}
