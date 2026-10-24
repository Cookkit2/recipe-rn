import React from "react";
import { render } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { AnimatedStack } from "../AnimatedStack";

jest.mock("expo-router", () => {
  const React = require("react");
  const Screen = () => null;
  const Stack = ({ children }: { children: React.ReactNode }) => {
    const screens = React.Children.toArray(children);
    if (screens.some((screen: React.ReactElement) => screen.type !== Screen))
      throw new Error("Stack children must be direct screens");
    return null;
  };
  return { Stack: Object.assign(jest.fn(Stack), { Screen }) };
});
jest.mock("~/hooks/useColor", () => () => ({ foreground: "black" }));
jest.mock("~/hooks/useNotificationHandlers", () => ({ useNotificationHandlers: jest.fn() }));
jest.mock("~/hooks/useOnboardingCheck", () => ({ useOnboardingCheck: jest.fn() }));
jest.mock("~/components/ui/typography", () => ({ H1: () => null }));
jest.mock("~/components/Ingredient/IngredientDeleteButton", () => () => null);
jest.mock("~/components/Recipe/Details/AddToPlanHeaderButton", () => () => null);
jest.mock("expo-symbols", () => ({ SymbolView: () => null }));

it("passes direct, uniquely named screens to the router across rerenders", async () => {
  const { rerender } = await render(<AnimatedStack />);
  await rerender(<AnimatedStack />);
  const stack = jest.mocked(Stack);
  const props = stack.mock.calls.at(-1)![0];
  const screens = React.Children.toArray(props.children) as React.ReactElement<{ name: string }>[];
  const names = screens.map((screen) => screen.props.name);
  expect(names).toContain("grocery-list/index");
  expect(new Set(names).size).toBe(names.length);
});
