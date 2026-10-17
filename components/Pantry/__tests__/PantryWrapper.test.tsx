import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import PantryWrapper from "../PantryWrapper";
import { TEST_IDS } from "~/constants/test-ids";

const pantry = {
  isRecipeOpen: true,
  updateRecipeOpen: jest.fn(),
  translateY: { value: 0 },
  context: { value: { y: 0 } },
  isGestureActive: { value: false },
  collapsedHeight: 86,
  expandedHeight: Dimensions.get("window").height * 0.75,
};

jest.mock("~/store/PantryContext", () => ({ usePantryStore: () => pantry }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("~/hooks/useDeviceCornerRadius", () => ({ __esModule: true, default: () => 64 }));
jest.mock("expo-status-bar", () => ({ setStatusBarStyle: jest.fn() }));
jest.mock("~/constants/curves", () => ({ CURVES: { "expressive.default.spatial": {} } }));
jest.mock("react-native-worklets", () => ({ scheduleOnRN: jest.fn() }));
jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const gesture = {
        activeOffsetY: jest.fn(),
        onStart: jest.fn(),
        onUpdate: jest.fn(),
        onEnd: jest.fn(),
      };
      Object.values(gesture).forEach((handler) => handler.mockReturnValue(gesture));
      return gesture;
    },
  },
}));
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    View: require("react-native").View,
    createAnimatedComponent: (component: unknown) => component,
  },
  useAnimatedStyle: (callback: () => unknown) => callback(),
  useDerivedValue: (callback: () => unknown) => ({ value: callback() }),
  withSpring: (value: number) => value,
  withTiming: (value: number) => value,
}));
jest.mock("../RecipeButton", () => ({ __esModule: true, default: () => null }));
jest.mock("../RecipeCategoryButtonGroup", () => ({ __esModule: true, default: () => null }));
jest.mock("../RecipeLists", () => ({ __esModule: true, default: () => null }));
jest.mock("../IngredientLists", () => ({ __esModule: true, default: () => null }));

describe("recipe drawer viewport", () => {
  it.each([
    ["collapsed", false, 0],
    ["peek", true, 0],
    ["partially expanded", true, -150],
    ["expanded", true, -pantry.expandedHeight + pantry.collapsedHeight],
  ] as const)("keeps its bottom inside the screen when %s", async (_, open, translation) => {
    pantry.isRecipeOpen = open;
    pantry.translateY.value = translation;
    const screen = await render(<PantryWrapper />);
    const drawer = screen.getByTestId(TEST_IDS.home.recipeSheet);
    const style = StyleSheet.flatten(drawer.props.style);
    expect(style.top).toBeGreaterThanOrEqual(0);
    expect(style.top).toBeLessThanOrEqual(Dimensions.get("window").height);
    // An offscreen, full-height sheet gives its nested list a false viewport.
    expect(style.bottom).toBe(0);
    expect(style.height).toBeUndefined();
    expect(drawer.props.className.split(/\s+/)).not.toContain("h-full");
  });

  it("recalculates the drawer viewport after the window is resized", async () => {
    const dimensions = jest.spyOn(require("react-native"), "useWindowDimensions");
    dimensions.mockReturnValue({ width: 430, height: 900, scale: 1, fontScale: 1 });
    pantry.isRecipeOpen = true;
    pantry.translateY.value = -200;
    const screen = await render(<PantryWrapper />);
    const top = () =>
      StyleSheet.flatten(screen.getByTestId(TEST_IDS.home.recipeSheet).props.style).top;
    expect(top()).toBe(900 - 278);
    dimensions.mockReturnValue({ width: 390, height: 600, scale: 1, fontScale: 1 });
    await screen.rerender(<PantryWrapper />);
    expect(top()).toBe(600 - 278);
    dimensions.mockRestore();
  });
});
