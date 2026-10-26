import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IngredientVisualPreview from "../Details/IngredientVisualPreview";
import { buildIngredientPreviewData } from "~/utils/ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: ({ visible, children, ...props }: any) =>
    visible
      ? React.createElement(
          require("react-native").View,
          { ...props, testID: "preview-modal" },
          children
        )
      : null,
}));
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
  ReduceMotion: { System: "system" },
  ZoomIn: { duration: () => ({ reduceMotion: () => ({}) }) },
}));
jest.mock("expo-blur", () => ({
  BlurView: (props: object) =>
    React.createElement(require("react-native").View, { ...props, testID: "preview-blur" }),
}));
jest.mock("react-native-keyboard-controller", () => ({
  KeyboardAvoidingView: require("react-native").View,
}));
jest.mock("uniwind", () => ({ useUniwind: () => ({ theme: "light" }) }));
jest.mock("~/components/Shared/RotationCard", () => ({
  __esModule: true,
  default: require("react-native").View,
}));
jest.mock("~/components/Shared/Shapes/ShapeContainer", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) =>
    React.createElement(require("react-native").Text, null, text),
}));
jest.mock("~/components/ui/outlined-image", () => {
  const Image = (props: object) =>
    React.createElement(require("react-native").View, { ...props, testID: "ingredient-photo" });
  return { __esModule: true, default: Image, OutlinedImage: Image };
});
jest.mock("~/components/ui/typography", () => ({
  H2: require("react-native").Text,
  P: require("react-native").Text,
}));
jest.mock("~/components/ui/button", () => ({
  Button: (props: object) =>
    React.createElement(require("react-native").Pressable, {
      ...props,
      accessibilityRole: "button",
    }),
}));
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({ border: "#bbb" }),
}));
jest.mock("lucide-uniwind", () => ({ XIcon: () => null }));

const ingredients: RecipeIngredient[] = Array.from({ length: 9 }, (_, index) => ({
  name: index === 0 ? "egg" : `ingredient ${index + 1}`,
  relatedIngredientId: `ingredient-${index}`,
  quantity: index === 0 ? 2.5 : index + 1,
  unit: index === 0 ? "piece" : "g",
}));
const findMatch = ({ name }: RecipeIngredient): PantryItem | null =>
  name === "egg" ? ({ id: "pantry-egg", image_url: "file:///egg.jpg" } as PantryItem) : null;
const props = {
  ingredientPreviewData: buildIngredientPreviewData(ingredients, findMatch),
  missingIngredientPalette: ["#bbb"],
  ingredients,
  findMatch,
};

it("opens every ingredient in recipe order, including items beyond the strip limit", async () => {
  const screen = await render(<IngredientVisualPreview {...props} />);
  expect(screen.queryByText("Ingredients")).toBeNull();
  expect(props.ingredientPreviewData.missing).toHaveLength(6);
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(screen.getByText("Ingredients")).toBeTruthy();
  expect(screen.getByText("Ingredient 9")).toBeTruthy();
  expect(screen.getByText("2.5 piece")).toBeTruthy();
  expect(screen.getByText("9 g")).toBeTruthy();
  expect(screen.getByTestId("preview-blur").props.tint).toBe("dark");
  const photos = screen.getAllByTestId("ingredient-photo");
  expect(photos[photos.length - 1]!.props.source).toBe("file:///egg.jpg");
  expect(screen.queryByRole("button", { name: "Start cooking" })).toBeNull();
});

it.each(["close", "outside", "system back"])("dismisses via %s and can reopen", async (action) => {
  const screen = await render(<IngredientVisualPreview {...props} />);
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  if (action === "system back")
    await fireEvent(screen.getByTestId("preview-modal"), "requestClose");
  else
    await fireEvent.press(
      screen.getByRole("button", {
        name: action === "close" ? "Close ingredients" : "Dismiss modal",
      })
    );
  expect(screen.queryByText("Ingredients")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(screen.getByText("Ingredient 9")).toBeTruthy();
});

it("does not open the overlay when the ingredient strip is dragged", async () => {
  const screen = await render(<IngredientVisualPreview {...props} />);
  const trigger = screen.getByRole("button", { name: "View recipe ingredients" });
  const touch = (pageX: number) => ({
    nativeEvent: { identifier: 0, pageX, pageY: 100 },
    preventDefault: jest.fn(),
  });
  await fireEvent(trigger, "touchStart", touch(100));
  await fireEvent(trigger, "touchMove", touch(40));
  await fireEvent(trigger, "touchEnd", touch(40));
  await fireEvent.press(trigger, touch(40));
  expect(screen.queryByText("Ingredients")).toBeNull();
});

it("forwards the Android blur target without changing quantities after an update", async () => {
  const blurTarget = { current: null };
  const screen = await render(<IngredientVisualPreview {...props} blurTarget={blurTarget} />);
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(screen.getByTestId("preview-blur").props.blurTarget).toBe(blurTarget);
  expect(screen.getByTestId("preview-blur").props.blurMethod).toBe("dimezisBlurView");
  await screen.rerender(
    <IngredientVisualPreview
      {...props}
      ingredients={[{ ...ingredients[0]!, quantity: 5 }]}
      blurTarget={blurTarget}
    />
  );
  expect(screen.getByText("5 piece")).toBeTruthy();
  expect(screen.queryByText("2.5 piece")).toBeNull();
});
