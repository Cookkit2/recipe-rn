import React from "react";
import { Dimensions, Pressable, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import PantryWrapper from "../PantryWrapper";
import { TEST_IDS } from "~/constants/test-ids";

const push = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push }) }));
jest.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 116 }));
const mockPullSearch = {
  phase: "closed",
  focusEnabled: false,
  searchOffset: { value: 0 },
  progress: { value: 0 },
  dismiss: jest.fn(),
  homeStyle: { opacity: 1 },
};
jest.mock("~/hooks/usePantryPullSearch", () => ({ usePantryPullSearch: () => mockPullSearch }));
const mockSearchContent = jest.fn((_props: unknown) => null);
jest.mock("~/components/Search/SearchContent", () => ({
  SearchContent: (props: unknown) => mockSearchContent(props),
}));
jest.mock("~/components/Search/SearchPreview", () => ({ SearchPreview: () => null }));
jest.mock("lucide-uniwind", () => ({ SparklesIcon: () => null }));
jest.mock("~/components/ui/button", () => ({
  Button: (props: object) => <Pressable {...props} />,
}));

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
const mockRecipeList = jest.fn((_props: unknown) => null);
jest.mock("../RecipeLists", () => ({
  __esModule: true,
  default: (props: unknown) => mockRecipeList(props),
}));
const mockIngredientMount = jest.fn();
jest.mock("../IngredientLists", () => ({
  __esModule: true,
  default: () => {
    require("react").useEffect(mockIngredientMount, []);
    return null;
  },
}));

it("keeps the scroll owner mounted through preview and only enables native search after release", async () => {
  mockIngredientMount.mockClear();
  mockSearchContent.mockClear();
  pantry.isRecipeOpen = false;
  mockPullSearch.phase = "closed";
  const screen = await render(<PantryWrapper pullSearch={mockPullSearch as never} />);
  mockPullSearch.phase = "pulling";
  await screen.rerender(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(mockSearchContent).not.toHaveBeenCalled();
  mockPullSearch.phase = "open";
  mockPullSearch.focusEnabled = true;
  await screen.rerender(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(mockSearchContent).toHaveBeenLastCalledWith(
    expect.objectContaining({ focusEnabled: true })
  );
  mockPullSearch.phase = "closing";
  mockPullSearch.focusEnabled = false;
  await screen.rerender(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(mockSearchContent).toHaveBeenLastCalledWith(
    expect.objectContaining({ focusEnabled: false })
  );
  expect(mockIngredientMount).toHaveBeenCalledTimes(1);
  mockPullSearch.phase = "closed";
  mockPullSearch.focusEnabled = false;
});

describe("recipe drawer viewport", () => {
  it.each([
    ["collapsed", false, 0],
    ["peek", true, 0],
    ["partially expanded", true, -150],
    ["expanded", true, -pantry.expandedHeight + pantry.collapsedHeight],
  ] as const)("keeps its bottom inside the screen when %s", async (_, open, translation) => {
    pantry.isRecipeOpen = open;
    pantry.translateY.value = translation;
    const screen = await render(<PantryWrapper pullSearch={mockPullSearch as never} />);
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
    const screen = await render(<PantryWrapper pullSearch={mockPullSearch as never} />);
    const top = () =>
      StyleSheet.flatten(screen.getByTestId(TEST_IDS.home.recipeSheet).props.style).top;
    expect(top()).toBe(900 - 278);
    dimensions.mockReturnValue({ width: 390, height: 600, scale: 1, fontScale: 1 });
    await screen.rerender(<PantryWrapper pullSearch={mockPullSearch as never} />);
    expect(top()).toBe(600 - 278);
    dimensions.mockRestore();
  });
});

it("does not mount recipe queries until first open and preserves the mounted list after closing", async () => {
  mockRecipeList.mockClear();
  pantry.isRecipeOpen = false;
  const screen = await render(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(mockRecipeList).not.toHaveBeenCalled();
  pantry.isRecipeOpen = true;
  await screen.rerender(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(mockRecipeList).toHaveBeenLastCalledWith({ active: true });
  pantry.isRecipeOpen = false;
  await screen.rerender(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(mockRecipeList).toHaveBeenLastCalledWith({ active: false });
});

it("uses Search as the assistant entry instead of a floating pantry button", async () => {
  pantry.isRecipeOpen = false;
  const screen = await render(<PantryWrapper pullSearch={mockPullSearch as never} />);
  expect(screen.queryByLabelText("Assistant")).toBeNull();
});
