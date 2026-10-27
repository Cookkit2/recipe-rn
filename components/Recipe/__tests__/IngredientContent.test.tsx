import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { IngredientsContent } from "../Step/IngredientContent";

const mockToggle = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("~/store/RecipeDetailContext", () => ({
  useRecipeDetailStore: () => ({ servings: 1 }),
}));
jest.mock("~/store/RecipeStepsContext", () => ({
  useRecipeSteps: () => {
    const [used, setUsed] = require("react").useState(new Set<string>());
    return {
      usedIngredientIds: used,
      toggleIngredient: (id: string) => {
        mockToggle(id);
        setUsed((current: Set<string>) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      allIngredientsUsed: false,
      goToNextStep: jest.fn(),
    };
  },
}));
jest.mock("~/hooks/queries/usePantryQueries", () => ({
  usePantryItemsByType: () => ({ data: [] }),
}));
jest.mock("~/hooks/useIngredientMatcher", () => ({
  useIngredientMatcher: () => ({
    findMatch: ({ name }: { name: string }) =>
      name === "egg" ? { id: "pantry-egg", image_url: "file:///egg.jpg" } : null,
  }),
}));
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({
    background: "#fff",
    foreground: "#111",
    mutedForeground: "#888",
    border: "#ccc",
  }),
}));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: require("react-native").View }));
jest.mock("~/components/ui/typography", () => {
  const { Text } = require("react-native");
  return { H2: Text, P: Text };
});
jest.mock("~/components/ui/text", () => ({ Text: require("react-native").Text }));
jest.mock("~/components/ui/button", () => ({ Button: require("react-native").Pressable }));
jest.mock("~/components/ui/outlined-image", () => ({
  __esModule: true,
  default: (props: object) => require("react").createElement(require("react-native").View, props),
}));
jest.mock("~/components/Shared/Shapes/ShapeContainer", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) =>
    require("react").createElement(require("react-native").Text, null, text),
}));
jest.mock("lucide-uniwind", () => ({
  CheckCircle2Icon: (props: object) =>
    require("react").createElement(require("react-native").View, {
      ...props,
      testID: "ingredient-used-check",
    }),
  ArrowRightIcon: () => null,
}));

const ingredients = [
  { name: "egg", relatedIngredientId: "egg", quantity: 1, unit: "piece" },
  { name: "flour", relatedIngredientId: "flour", quantity: 100, unit: "g" },
];
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Haptics.impactAsync).mockResolvedValue(undefined);
});

it("uses the same checkmark for photo and placeholder cards, with one light haptic per toggle", async () => {
  const screen = await render(<IngredientsContent ingredients={ingredients} totalSteps={2} />);
  const egg = () => screen.getByRole("button", { name: /^Egg\./ });
  const flour = () => screen.getByRole("button", { name: /^Flour\./ });
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
  await fireEvent.press(egg());
  await fireEvent.press(flour());
  expect(mockToggle.mock.calls).toEqual([["egg"], ["flour"]]);
  expect(jest.mocked(Haptics.impactAsync).mock.calls).toEqual([["light"], ["light"]]);
  const photoCheck = within(egg()).getByTestId("ingredient-used-check");
  const placeholderCheck = within(flour()).getByTestId("ingredient-used-check");
  for (const key of ["size", "strokeWidth", "className", "fill"])
    expect(photoCheck.props[key]).toEqual(placeholderCheck.props[key]);
  expect(screen.queryByText("✓")).toBeNull();
  await fireEvent.press(flour());
  expect(flour().props.accessibilityState.selected).toBe(false);
  expect(within(flour()).queryByTestId("ingredient-used-check")).toBeNull();
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
});

it("keeps press animations and pantry long-press separate from tap feedback", async () => {
  const screen = await render(<IngredientsContent ingredients={ingredients} totalSteps={2} />);
  const egg = screen.getByRole("button", { name: /^Egg\./ });
  await fireEvent(egg, "pressIn");
  await fireEvent(egg, "pressOut");
  await fireEvent(egg, "longPress");
  expect(mockPush).toHaveBeenCalledWith("/ingredient/pantry-egg");
  expect(mockToggle).not.toHaveBeenCalled();
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

it("still toggles when haptics are unavailable", async () => {
  jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error("Haptics unavailable"));
  const screen = await render(<IngredientsContent ingredients={ingredients} totalSteps={2} />);
  await fireEvent.press(screen.getByRole("button", { name: /^Flour\./ }));
  expect(mockToggle).toHaveBeenCalledWith("flour");
  expect(screen.getByRole("button", { name: /^Flour\./ }).props.accessibilityState.selected).toBe(
    true
  );
});
