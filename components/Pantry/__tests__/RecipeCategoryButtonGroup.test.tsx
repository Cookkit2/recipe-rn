import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import RecipeCategoryButtonGroup from "../RecipeCategoryButtonGroup";

const mockUpdateTag = jest.fn();
const mockExpand = jest.fn();
const mockRandomRecommendation = jest.fn();

jest.mock("~/store/PantryContext", () => ({
  usePantryStore: () => ({ snapToExpanded: mockExpand }),
}));
jest.mock("~/store/RecipeContext", () => ({
  useRecipeStore: () => ({ selectedRecipeTags: [], updateRecipeTag: mockUpdateTag }),
}));
jest.mock("~/hooks/useColor", () => ({
  useLightColors: () => ({
    primary: "orange",
    primaryForeground: "white",
    mutedForeground: "gray",
    background: "white",
  }),
}));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({
  useRandomRecipeRecommendation: () => mockRandomRecommendation(),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner-native", () => ({ toast: {} }));
jest.mock("../ImportRecipeDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("~/components/ui/separator", () => ({ Separator: () => null }));
jest.mock("lucide-uniwind", () => ({
  DicesIcon: () => null,
  GlobeIcon: () => null,
  IceCreamConeIcon: () => null,
  MartiniIcon: () => null,
  SoupIcon: () => null,
}));
jest.mock("~/components/ui/typography", () => ({ P: require("react-native").Text }));
jest.mock("~/components/ui/button", () => ({
  Button: ({ children, ...props }: any) =>
    React.createElement(require("react-native").Pressable, props, children),
}));

it("keeps Home recipe filters working while quick actions are commented out", async () => {
  const screen = await render(<RecipeCategoryButtonGroup />);
  expect(screen.getByText("Meal")).toBeTruthy();
  expect(screen.getByText("Dessert")).toBeTruthy();
  expect(screen.getByText("Drink")).toBeTruthy();
  expect(screen.queryByLabelText("Choose a random recipe")).toBeNull();
  expect(screen.queryByLabelText("Import recipe from URL")).toBeNull();
  expect(mockRandomRecommendation).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Meal"));
  expect(mockUpdateTag).toHaveBeenCalledWith("meal");
  expect(mockExpand).toHaveBeenCalledTimes(1);
});
