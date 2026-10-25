import React from "react";
import { render } from "@testing-library/react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useUniwind } from "uniwind";
import { AnimatedStack } from "../AnimatedStack";
import useColors from "~/hooks/useColor";

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  // Exercise the real navigation theme context without loading the native router.
  const { ThemeProvider } = jest.requireActual(
    "expo-router/build/react-navigation/core/theming/ThemeProvider"
  );
  const { useTheme } = jest.requireActual(
    "expo-router/build/react-navigation/core/theming/useTheme"
  );
  const { DarkTheme } = jest.requireActual(
    "expo-router/build/react-navigation/native/theming/DarkTheme"
  );
  const { DefaultTheme } = jest.requireActual(
    "expo-router/build/react-navigation/native/theming/DefaultTheme"
  );
  const Screen = () => null;
  const Stack = ({ children }: { children: React.ReactNode }) => {
    const theme = useTheme();
    const screens = React.Children.toArray(children);
    if (screens.some((screen: React.ReactElement) => screen.type !== Screen))
      throw new Error("Stack children must be direct screens");
    return React.createElement(View, {
      testID: "native-stack-background",
      style: { backgroundColor: theme.colors.background },
      accessibilityHint: theme.dark ? "dark" : "light",
    });
  };
  return {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
    Stack: Object.assign(jest.fn(Stack), { Screen }),
  };
});
jest.mock("uniwind", () => ({
  useUniwind: jest.fn(() => ({ theme: "light" })),
  withUniwind: (component: unknown) => component,
}));
jest.mock("~/hooks/useColor", () => jest.fn(() => ({ foreground: "black", background: "white" })));
jest.mock("~/hooks/useNotificationHandlers", () => ({ useNotificationHandlers: jest.fn() }));
jest.mock("~/hooks/useOnboardingCheck", () => ({ useOnboardingCheck: jest.fn() }));
jest.mock("~/components/ui/typography", () => ({ H1: () => null }));
jest.mock("~/components/Ingredient/IngredientDeleteButton", () => () => null);
jest.mock("~/components/Recipe/Details/AddToPlanHeaderButton", () => () => null);
jest.mock("expo-symbols", () => ({ SymbolView: () => null }));

function Navigation() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AnimatedStack />
    </ThemeProvider>
  );
}

it("passes direct, uniquely named screens to the router across rerenders", async () => {
  const { rerender } = await render(<Navigation />);
  await rerender(<Navigation />);
  const stack = jest.mocked(Stack);
  const props = stack.mock.calls.at(-1)![0];
  const screens = React.Children.toArray(props.children) as React.ReactElement<{ name: string }>[];
  const names = screens.map((screen) => screen.props.name);
  expect(names).toContain("grocery-list/index");
  expect(new Set(names).size).toBe(names.length);
  const assistant = screens.find((screen) => screen.props.name === "assistant/index");
  expect((assistant?.props as { options?: unknown }).options).toMatchObject({
    headerTitle: "Assistant",
    headerTransparent: false,
    headerStyle: { backgroundColor: "white" },
  });
});

it("updates the native header tint when the app theme changes", async () => {
  jest.mocked(useColors).mockReturnValue({ foreground: "white" } as ReturnType<typeof useColors>);
  const { rerender } = await render(<Navigation />);
  expect(jest.mocked(Stack).mock.calls.at(-1)![0].screenOptions).toEqual(
    expect.objectContaining({ headerTintColor: "white" })
  );

  jest.mocked(useColors).mockReturnValue({ foreground: "black" } as ReturnType<typeof useColors>);
  await rerender(<Navigation />);
  expect(jest.mocked(Stack).mock.calls.at(-1)![0].screenOptions).toEqual(
    expect.objectContaining({ headerTintColor: "black" })
  );
});

it("keeps the native transition backdrop aligned with the resolved app theme", async () => {
  const darkColors = {
    background: "#0b0b0b",
    foreground: "#f1f1f1",
    card: "#161616",
    primary: "#ef4444",
    border: "#333333",
    destructive: "#ff6666",
  } as ReturnType<typeof useColors>;
  jest.mocked(useColors).mockReturnValue(darkColors);
  jest.mocked(useUniwind).mockReturnValue({ theme: "dark", hasAdaptiveThemes: true });

  const { getByTestId, rerender } = await render(<Navigation />);
  expect(getByTestId("native-stack-background")).toHaveStyle({ backgroundColor: "#0b0b0b" });
  expect(getByTestId("native-stack-background").props.accessibilityHint).toBe("dark");

  jest.mocked(useUniwind).mockReturnValue({ theme: "light", hasAdaptiveThemes: false });
  jest.mocked(useColors).mockReturnValue({ ...darkColors, background: "#e4e4e4" });
  await rerender(<Navigation />);
  expect(getByTestId("native-stack-background")).toHaveStyle({ backgroundColor: "#e4e4e4" });
  expect(getByTestId("native-stack-background").props.accessibilityHint).toBe("light");
});
