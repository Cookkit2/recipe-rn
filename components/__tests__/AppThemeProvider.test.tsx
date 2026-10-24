import { renderHook } from "@testing-library/react-native";
import { useUniwind } from "uniwind";
import { AppThemeProvider } from "../AppThemeProvider";
import { ThemeProvider, DefaultTheme } from "expo-router";
import { useHeaderConfigProps } from "expo-router/build/react-navigation/native-stack/views/useHeaderConfigProps";
import type { PropsWithChildren } from "react";

jest.mock("expo-router", () => ({
  ThemeProvider: jest.requireActual("expo-router/build/react-navigation/core/theming/ThemeProvider")
    .ThemeProvider,
  DefaultTheme: jest.requireActual("expo-router/build/react-navigation/native/theming/DefaultTheme")
    .DefaultTheme,
  DarkTheme: jest.requireActual("expo-router/build/react-navigation/native/theming/DarkTheme")
    .DarkTheme,
}));
jest.mock("expo-router/build/react-navigation/native/index", () => ({
  useTheme: jest.requireActual("expo-router/build/react-navigation/core/theming/useTheme").useTheme,
  useLocale: () => ({ direction: "ltr" }),
}));
jest.mock("expo-router/build/react-navigation/elements/index", () => ({
  getHeaderTitle: (_: unknown, name: string) => name,
}));
jest.mock("expo-router/build/react-navigation/native-stack/views/FontProcessor", () => ({
  processFonts: (fonts: unknown[]) => fonts,
}));
jest.mock("uniwind", () => ({ useUniwind: jest.fn() }));
jest.mock("~/hooks/useColor", () => () => ({
  foreground: "white",
  background: "black",
  card: "#111",
  border: "#333",
  destructive: "red",
}));
jest.mock("react-native-screens", () => ({ isSearchBarAvailableForCurrentPlatform: false }));
jest.mock("expo-glass-effect", () => ({ isLiquidGlassAvailable: () => true }));

function Wrapper({ children }: PropsWithChildren) {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AppThemeProvider>{children}</AppThemeProvider>
    </ThemeProvider>
  );
}

it("sets the real native header and glass appearance from the app theme", async () => {
  const theme = jest.mocked(useUniwind);
  theme.mockReturnValue({ theme: "dark", hasAdaptiveThemes: false });
  const { result, rerender } = await renderHook(
    () =>
      useHeaderConfigProps({
        route: { key: "profile", name: "profile" },
        headerBackButtonDisplayMode: "minimal",
        headerTopInsetEnabled: true,
        headerHeight: 44,
        headerBack: undefined,
      }),
    { wrapper: Wrapper }
  );
  expect(result.current.experimental_userInterfaceStyle).toBe("dark");
  expect(result.current.color).toBe("white");
  theme.mockReturnValue({ theme: "light", hasAdaptiveThemes: false });
  await rerender({});
  expect(result.current.experimental_userInterfaceStyle).toBe("light");
});
