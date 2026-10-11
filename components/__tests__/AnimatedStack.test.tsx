import { Children, isValidElement, type ReactElement } from "react";
import { Stack } from "expo-router";
import { AnimatedStack } from "../AnimatedStack";

jest.mock("expo-router", () => {
  const Stack = Object.assign(() => null, { Screen: () => null });
  return { Stack };
});
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({ foreground: "black" }),
}));
jest.mock("~/hooks/useNotificationHandlers", () => ({ useNotificationHandlers: jest.fn() }));
jest.mock("~/hooks/useOnboardingCheck", () => ({ useOnboardingCheck: jest.fn() }));
jest.mock("~/components/ui/typography", () => ({ H1: "Text" }));
jest.mock("~/components/Recipe/Details/AddToPlanHeaderButton", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/components/Ingredient/IngredientDeleteButton", () => ({
  __esModule: true,
  default: () => null,
}));

it("passes direct screen definitions to Expo Router and preserves route options", () => {
  const stack = AnimatedStack();
  const children = Children.toArray(stack.props.children);
  expect(children.length).toBeGreaterThan(5);
  expect(children.every((child) => isValidElement(child) && child.type === Stack.Screen)).toBe(
    true
  );
  const screens = children.filter(isValidElement) as ReactElement<{
    name: string;
    options?: { headerShown?: boolean; headerTitle?: string };
  }>[];
  const names = screens.map((screen) => screen.props.name);
  expect(new Set(names).size).toBe(names.length);
  expect(names).toEqual(
    expect.arrayContaining(["index", "profile/index", "(misc)/search", "onboarding/index"])
  );
  expect(
    screens.find((screen) => screen.props.name === "(misc)/search")?.props.options?.headerShown
  ).toBe(false);
  expect(screens.find((screen) => screen.props.name === "(auth)")?.props.options?.headerShown).toBe(
    false
  );
  expect(screens.find((screen) => screen.props.name === "index")?.props.options?.headerShown).toBe(
    true
  );
});
