import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IngredientVisualPreview from "../Details/IngredientVisualPreview";
import { buildIngredientPreviewData } from "~/utils/ingredient-preview";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const Native = require("react-native");
  return {
    __esModule: true,
    default: {
      View: React.forwardRef((props: object, ref: unknown) => {
        React.useImperativeHandle(ref, () => ({
          measureInWindow: (callback: Function) => callback(24, 500, 345, 72),
        }));
        return React.createElement(Native.View, props);
      }),
      ScrollView: Native.ScrollView,
    },
    ReduceMotion: { System: "system" },
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    useDerivedValue: (read: () => unknown) => ({ value: read() }),
    useAnimatedStyle: (read: () => unknown) => read(),
    useAnimatedRef: () => React.useRef(null),
    useAnimatedReaction: (
      prepare: () => unknown,
      react: (value: unknown, previous: unknown) => void
    ) => {
      const previous = React.useRef(null);
      const next = prepare();
      React.useEffect(() => {
        react(next, previous.current);
        previous.current = next;
      }, [next]);
    },
    useAnimatedScrollHandler: (handler: any) => (event: any) =>
      handler.onScroll(event.nativeEvent ?? event),
    withSpring: (value: number) => value,
    interpolate: (value: number, input: number[], output: number[]) =>
      output[0]! + ((value - input[0]!) / (input[1]! - input[0]!)) * (output[1]! - output[0]!),
    measure: () => ({ pageX: 24, pageY: 500, width: 345, height: 72 }),
    scrollTo: jest.fn(),
  };
});
jest.mock("react-native/Libraries/Utilities/BackHandler", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    exitApp: jest.fn(),
  },
}));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@rn-primitives/portal", () => ({ Portal: ({ children }: any) => children }));
jest.mock("react-native-screens", () => ({ FullWindowOverlay: ({ children }: any) => children }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
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
  stableThumbRotation: (index: number) => index * 2 - 8,
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

beforeEach(() => {
  jest
    .spyOn(require("react-native").BackHandler, "addEventListener")
    .mockImplementation(() => ({ remove: jest.fn() }));
  jest
    .spyOn(require("react-native"), "useWindowDimensions")
    .mockReturnValue({ width: 393, height: 852, scale: 3, fontScale: 1 });
});
afterEach(() => {
  jest.restoreAllMocks();
});

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
  expect(
    screen.getByTestId("recipe-ingredients-layer", { includeHiddenElements: true }).props
      .pointerEvents
  ).toBe("none");
  expect(props.ingredientPreviewData.missing).toHaveLength(6);
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(screen.getByText("Ingredients")).toBeTruthy();
  expect(screen.getByTestId("recipe-ingredients-layer").props.pointerEvents).toBe("box-none");
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
    await require("@testing-library/react-native").act(async () => {
      const calls = jest.mocked(require("react-native").BackHandler.addEventListener).mock.calls;
      const listener = calls[calls.length - 1]?.[1] as (() => boolean) | undefined;
      expect(listener?.()).toBe(true);
    });
  else
    await fireEvent.press(
      screen.getByRole("button", {
        name: action === "close" ? "Close ingredients" : "Dismiss ingredients",
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

it("moves the mounted preview photo into the expanded layout without a second image", async () => {
  const screen = await render(<IngredientVisualPreview {...props} />);
  const original = screen.getByTestId("ingredient-photo", { includeHiddenElements: true });
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(screen.getAllByTestId("ingredient-photo", { includeHiddenElements: true })).toHaveLength(
    1
  );
  expect(screen.getByTestId("ingredient-photo", { includeHiddenElements: true })).toBe(original);
});

it("uses a full-screen scroll viewport outside the backdrop pressable without remounting images", async () => {
  const Native = require("react-native");
  const many = Array.from({ length: 19 }, (_, index) => ({
    ...ingredients[0]!,
    name: index === 0 ? "egg" : `ingredient ${index + 1}`,
    relatedIngredientId: `long-${index}`,
  }));
  const longProps = {
    ...props,
    ingredients: many,
    ingredientPreviewData: buildIngredientPreviewData(many, findMatch),
  };
  const screen = await render(<IngredientVisualPreview {...longProps} />);
  const photo = screen.getByTestId("ingredient-photo", { includeHiddenElements: true });
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  const scroll = screen.getByTestId("recipe-ingredients-scroll");
  const height = Native.StyleSheet.flatten(scroll.props.style).height;
  const extent = Native.StyleSheet.flatten(
    screen.getByTestId("recipe-ingredients-content").props.style
  ).height;
  expect(scroll.props.scrollEnabled).toBe(true);
  expect(height).toBe(852);
  expect(Native.StyleSheet.flatten(scroll.props.style).width).toBe(393);
  expect(extent).toBeGreaterThan(height);
  for (let node = scroll.parent; node; node = node.parent)
    expect(node.props.accessibilityLabel).not.toBe("Dismiss ingredients");
  await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: extent - height } } });
  await screen.rerender(
    <IngredientVisualPreview
      {...longProps}
      ingredients={many.map((ingredient) => ({ ...ingredient, quantity: ingredient.quantity + 1 }))}
    />
  );
  expect(screen.getByText("Ingredient 19")).toBeTruthy();
  expect(screen.getByTestId("ingredient-photo")).toBe(photo);
  await fireEvent.press(screen.getByRole("button", { name: "Close ingredients" }));
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(screen.getByTestId("ingredient-photo")).toBe(photo);
});

it("resets the gallery only after closing, without issuing scroll commands while the recipe is browsed", async () => {
  const { scrollTo } = require("react-native-reanimated");
  scrollTo.mockClear();
  const screen = await render(<IngredientVisualPreview {...props} />);
  expect(scrollTo).not.toHaveBeenCalled();
  await screen.rerender(<IngredientVisualPreview {...props} ingredients={[...ingredients]} />);
  expect(scrollTo).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "View recipe ingredients" }));
  expect(scrollTo).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Close ingredients" }));
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollTo).toHaveBeenCalledWith(expect.anything(), 0, 0, false);
});

it("follows recipe scrolling with transforms while retaining the measured layout", async () => {
  const Native = require("react-native");
  const offset = { value: 0 } as any;
  const screen = await render(<IngredientVisualPreview {...props} scrollOffset={offset} />);
  await fireEvent(screen.getByTestId("recipe-ingredient-source"), "layout", {
    nativeEvent: { layout: { width: 345, height: 72 } },
  });
  await screen.rerender(
    <IngredientVisualPreview {...props} ingredients={[...ingredients]} scrollOffset={offset} />
  );
  const before = Native.StyleSheet.flatten(
    screen.getByTestId("recipe-ingredients-canvas", { includeHiddenElements: true }).props.style
  );
  offset.value = 120;
  await screen.rerender(
    <IngredientVisualPreview {...props} ingredients={[...ingredients]} scrollOffset={offset} />
  );
  const after = Native.StyleSheet.flatten(
    screen.getByTestId("recipe-ingredients-canvas", { includeHiddenElements: true }).props.style
  );
  expect(after.top).toBe(before.top);
  expect(after.height).toBe(before.height);
  expect(after.transform).toEqual([{ translateY: -120 }]);
});
