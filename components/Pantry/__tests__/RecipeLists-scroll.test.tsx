import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import RecipeLists from "../RecipeLists";

const recommendations = {
  recipes: [1, 2, 3, 4].map((id) => ({ recipe: { id, title: `Dessert ${id}` } })),
  isLoading: false,
  error: null,
};
const prefetch = jest.fn();
const tags = ["dessert"];

jest.mock("~/store/RecipeContext", () => ({
  useRecipeStore: () => ({ selectedRecipeTags: tags }),
}));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({
  useRecipeRecommendations: () => recommendations,
}));
jest.mock("~/hooks/useImagePreloader", () => ({ useImagePreloader: () => ({ prefetch }) }));
jest.mock("~/hooks/recommendation", () => {
  class Strategy {
    addFilter() {
      return this;
    }
    addStrategy() {
      return this;
    }
  }
  return {
    CompositeFilterStrategy: Strategy,
    CategoryFilter: Strategy,
    CompositeRankingStrategy: Strategy,
    ReadinessStrategy: Strategy,
    DietaryFilter: Strategy,
    createHistoryAwareRankingStrategy: () => ({}),
  };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 34 }) }));
jest.mock("~/constants/curves", () => ({ CURVES: { "expressive.fast.effects": {} } }));
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
  useSharedValue: (initial: number) => require("react").useRef({ value: initial }).current,
  useAnimatedStyle: (callback: () => unknown) => callback(),
  withTiming: (value: number) => value,
}));
jest.mock("@legendapp/list", () => ({
  LegendList: (props: object) =>
    require("react").createElement(require("react-native").View, { ...props, testID: "recipes" }),
}));
jest.mock("../RecipeItemCard", () => ({ __esModule: true, default: () => null }));
jest.mock("../ExpiringRecipesSection", () => ({ __esModule: true, default: () => null }));
jest.mock("~/components/ui/typography", () => ({
  H4: require("react-native").Text,
  P: require("react-native").Text,
}));

it("keeps the list viewport stable while crossing the scroll decoration threshold", async () => {
  const screen = await render(<RecipeLists />);
  const geometry = () => {
    const separator =
      StyleSheet.flatten(screen.getByTestId("recipe-scroll-separator").props.style) ?? {};
    const frame = StyleSheet.flatten(screen.getByTestId("recipe-list-frame").props.style) ?? {};
    return { separatorHeight: separator.height, frameBorder: frame.borderTopWidth };
  };
  const initialGeometry = geometry();
  for (const y of [9, 11, 50, 9, 0]) {
    await fireEvent.scroll(screen.getByTestId("recipes"), {
      nativeEvent: {
        contentOffset: { x: 0, y },
        layoutMeasurement: { width: 400, height: 600 },
        contentSize: { width: 400, height: 650 },
      },
    });
    await screen.rerender(<RecipeLists />);
    expect(geometry()).toEqual(initialGeometry);
  }
});

it("uses safe-area spacing rather than padding that compensates for an offscreen viewport", async () => {
  const screen = await render(<RecipeLists />);
  const padding = screen.getByTestId("recipes").props.contentContainerStyle.paddingBottom;
  expect(padding).toBeGreaterThanOrEqual(34);
  expect(padding).toBeLessThanOrEqual(34 + 32);
});
