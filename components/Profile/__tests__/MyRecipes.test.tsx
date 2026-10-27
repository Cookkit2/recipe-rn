import React from "react";
import { Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import MyRecipesScreen from "~/app/profile/my-recipes";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
const mockRefetch = jest.fn().mockResolvedValue({});
const mockSearchBlur = jest.fn();
let mockQuery: Record<string, unknown>;

jest.mock("expo-router", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  const Toolbar = Object.assign(({ children }: any) => <View>{children}</View>, {
    Button: (props: any) => <Pressable {...props} accessibilityRole="button" />,
  });
  const Screen = ({ options }: any) => <View>{options.headerRight?.()}</View>;
  const SearchBar = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ blur: mockSearchBlur }));
    return <View {...props} testID="my-recipes-native-search" />;
  });
  const Link = Object.assign(
    ({ href, children }: any) => React.cloneElement(children, { onPress: () => mockPush(href) }),
    { AppleZoom: ({ children }: any) => <>{children}</> }
  );
  return {
    Stack: { Screen, Toolbar, SearchBar },
    Link,
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});
jest.mock("expo-image", () => ({
  Image: (props: object) => require("react").createElement("View", props),
}));
jest.mock("lucide-uniwind", () => ({
  BookOpenIcon: () => null,
  HistoryIcon: () => null,
  PlusIcon: () => null,
  CheckCircleIcon: () => null,
}));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
}));
jest.mock("~/hooks/animation/useButtonAnimations", () => ({
  __esModule: true,
  default: () => ({ animatedStyle: {}, roundedStyle: {} }),
}));
jest.mock("~/hooks/queries/useFavorites", () => ({
  useToggleFavorite: () => ({ mutate: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 12 }) }));
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({ background: "#fff", foreground: "#111", mutedForeground: "#666" }),
}));
jest.mock("~/hooks/queries/useMyRecipes", () => ({ useMyRecipes: () => mockQuery }));
jest.mock("~/components/Pantry/ImportRecipeDialog", () => ({
  __esModule: true,
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    const { Pressable, Text } = require("react-native");
    return open ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close recipe import"
        onPress={() => onOpenChange(false)}
      >
        <Text>Import recipe dialog</Text>
      </Pressable>
    ) : null;
  },
}));
jest.mock("~/components/ui/typography", () => {
  const { Text } = require("react-native");
  return { H4: Text, P: Text, Small: Text };
});
jest.mock("~/components/ui/button", () => ({
  Button: ({ children, ...props }: any) =>
    require("react").createElement(require("react-native").Pressable, props, children),
}));
jest.mock("~/components/ui/input", () => ({
  Input: (props: object) => require("react").createElement(require("react-native").View, props),
}));
jest.mock("~/components/Shared/RecyclingList", () => ({
  __esModule: true,
  default: ({ data, renderItem, empty, ...props }: any) =>
    require("react").createElement(
      require("react-native").View,
      props,
      data.length
        ? data.map((item: any, index: number) =>
            require("react").createElement(
              require("react-native").View,
              { key: item.id },
              renderItem({ item, index })
            )
          )
        : empty
    ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { data: [], isPending: false, error: null, refetch: mockRefetch };
});

it.each(["ios", "android", "web"])(
  "opens and closes recipe import from the %s plus action",
  async (platform) => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: platform, configurable: true });
    try {
      const screen = await render(<MyRecipesScreen />);
      expect(screen.queryByText("Import recipe dialog")).toBeNull();
      await fireEvent.press(screen.getByRole("button", { name: "Import recipe" }));
      expect(screen.getByText("Import recipe dialog")).toBeTruthy();
      await fireEvent.press(screen.getByRole("button", { name: "Close recipe import" }));
      expect(screen.queryByText("Import recipe dialog")).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Cooking history" })).toBeTruthy();
    } finally {
      Object.defineProperty(Platform, "OS", { value: original, configurable: true });
    }
  }
);

it.each(["ios", "android"])(
  "opens cooking history from the %s top-right action, even in an empty library",
  async (platform) => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: platform, configurable: true });
    try {
      const screen = await render(<MyRecipesScreen />);
      expect(screen.getByText("No recipes saved yet")).toBeTruthy();
      expect(screen.getByTestId("my-recipes-native-search")).toBeTruthy();
      await fireEvent.press(screen.getByRole("button", { name: "Cooking history" }));
      expect(mockPush).toHaveBeenCalledWith("/profile/cooked-recipes");
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(Platform, "OS", { value: original, configurable: true });
    }
  }
);

it("searches saved titles and descriptions, reopens a recipe and keeps image-free recipes accessible", async () => {
  mockQuery.data = [
    {
      id: "noodles",
      title: "Noodles",
      description: "Dinner",
      imageUrl: "",
      ingredients: [],
      instructions: [],
    },
    {
      id: "rice",
      title: "Fried Rice",
      description: "Easy egg dish",
      imageUrl: "https://example.com/food.jpg",
      ingredients: [],
      instructions: [],
    },
  ];
  const screen = await render(<MyRecipesScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Noodles" }));
  expect(mockPush).toHaveBeenCalledWith("/recipes/noodles");
  await fireEvent(screen.getByTestId("my-recipes-native-search"), "changeText", {
    nativeEvent: { text: " EGG " },
  });
  expect(screen.queryByText("Noodles")).toBeNull();
  expect(screen.getByText("Fried Rice")).toBeTruthy();
  await fireEvent(screen.getByTestId("my-recipes-native-search"), "searchButtonPress");
  expect(mockSearchBlur).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Fried Rice")).toBeTruthy();
  await fireEvent(screen.getByTestId("my-recipes-native-search"), "changeText", {
    nativeEvent: { text: "missing" },
  });
  expect(screen.getByText("No matching recipes")).toBeTruthy();
  await fireEvent(screen.getByTestId("my-recipes-native-search"), "cancelButtonPress");
  expect(screen.getByText("Noodles")).toBeTruthy();
});

it("preserves the history action while loading or showing a read error", async () => {
  mockQuery = { ...mockQuery, isPending: true };
  const screen = await render(<MyRecipesScreen />);
  expect(screen.getByLabelText("Loading my recipes")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Cooking history" })).toBeTruthy();
  mockQuery = { ...mockQuery, isPending: false, error: new Error("Read failed") };
  await screen.rerender(<MyRecipesScreen />);
  expect(screen.getByText("Couldn't load your recipes")).toBeTruthy();
  await fireEvent.press(screen.getByText("Try again"));
  expect(mockRefetch).toHaveBeenCalledTimes(2);
});

it("keeps saved recipes visible when a background refresh fails", async () => {
  mockQuery = {
    ...mockQuery,
    data: [{ id: "saved", title: "Saved soup", description: "", imageUrl: "" }],
    error: new Error("Offline"),
  };
  const screen = await render(<MyRecipesScreen />);
  expect(screen.getByText("Saved soup")).toBeTruthy();
  expect(screen.queryByText("Couldn't load your recipes")).toBeNull();
});

it("scrolling a saved recipe does not open its detail screen", async () => {
  mockQuery.data = [{ id: "noodles", title: "Noodles", description: "", imageUrl: "" }];
  const screen = await render(<MyRecipesScreen />);
  const row = screen.getByRole("button", { name: "Noodles" });
  const touch = (pageY: number) => ({
    nativeEvent: { identifier: 0, pageX: 50, pageY },
    preventDefault: jest.fn(),
  });
  await fireEvent(row, "touchStart", touch(300));
  await fireEvent(row, "touchMove", touch(200));
  await fireEvent(row, "touchEnd", touch(200));
  await fireEvent.press(row, touch(200));
  expect(mockPush).not.toHaveBeenCalled();
});

it("restores the library when Android's native search is closed", async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
  try {
    mockQuery.data = [{ id: "soup", title: "Soup", description: "Lunch", imageUrl: "" }];
    const screen = await render(<MyRecipesScreen />);
    await fireEvent(screen.getByTestId("my-recipes-native-search"), "changeText", {
      nativeEvent: { text: "missing" },
    });
    expect(screen.getByText("No matching recipes")).toBeTruthy();
    await fireEvent(screen.getByTestId("my-recipes-native-search"), "close");
    expect(screen.getByText("Soup")).toBeTruthy();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
});

it("keeps the web search input functional without a native header search", async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  try {
    mockQuery.data = [{ id: "soup", title: "Soup", description: "Lunch", imageUrl: "" }];
    const screen = await render(<MyRecipesScreen />);
    expect(screen.queryByTestId("my-recipes-native-search")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search my recipes"), "missing");
    expect(screen.getByText("No matching recipes")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Search my recipes"), "");
    expect(screen.getByText("Soup")).toBeTruthy();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
});
