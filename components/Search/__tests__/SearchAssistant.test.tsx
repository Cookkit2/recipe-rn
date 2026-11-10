import React from "react";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import SearchScreen from "~/app/(misc)/search";
import { SearchContent } from "../SearchContent";
import type { CookingAgent, AgentTurnInput } from "~/lib/agent/types";
import { TEST_IDS } from "~/constants/test-ids";

let mockHeaderHeight = 118;
jest.mock("expo-glass-effect", () => ({
  GlassView: require("react-native").View,
  isLiquidGlassAvailable: () => true,
}));
jest.mock("expo-symbols", () => ({ SymbolView: require("react-native").View }));
jest.mock("uniwind", () => ({ useUniwind: () => ({ theme: "light" }) }));
jest.mock("react-native-keyboard-controller", () => ({
  useReanimatedKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }),
}));
jest.mock("~/components/ui/skeleton", () => ({
  __esModule: true,
  default: require("react-native").View,
}));
jest.mock("~/components/Pantry/RecipeItemCard", () => ({
  __esModule: true,
  default: ({ recipe }: any) =>
    require("react").createElement(require("react-native").Text, null, recipe.title),
}));
jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: () => mockHeaderHeight,
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockReplace = jest.fn();
const mockClient = {};
const mockCreateAgent = jest.fn();
const mockTurns: AgentTurnInput[] = [];
const mockRecipes = [{ id: "r1", title: "Egg fried rice", description: "Quick dinner" }];
const mockPantry = [{ id: "p1", name: "eggs" }];
const mockUseRecipes = jest.fn(() => ({ data: mockRecipes, isPending: false }));
const mockUsePantryItems = jest.fn(() => ({ data: mockPantry, isPending: false }));
const mockUseFeatureFlag = jest.fn(() => ({ enabled: false }));
const emptyWebSearch = {
  data: [],
  isFetching: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};
let mockWebSearch: Record<string, unknown> = emptyWebSearch;
const mockUseWebRecipeSearch = jest.fn((query: string, _enabled: boolean) =>
  query ? mockWebSearch : emptyWebSearch
);
jest.mock("~/hooks/queries/useWebRecipeSearch", () => ({
  useWebRecipeSearch: (query: string, enabled: boolean) => mockUseWebRecipeSearch(query, enabled),
}));
jest.mock("expo-image", () => ({ Image: require("react-native").View }));
jest.mock("react-native", () =>
  Object.defineProperties(Object.create(jest.requireActual("react-native")), {
    BackHandler: { value: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } },
    TextInput: {
      value: require("react").forwardRef((props: any, ref: any) => {
        require("react").useImperativeHandle(ref, () => ({ focus: jest.fn(), blur: jest.fn() }));
        return require("react").createElement(require("react-native").View, props);
      }),
    },
    Platform: {
      value: { ...jest.requireActual("react-native").Platform, OS: "ios", Version: "27.0" },
    },
  })
);
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      push: mockPush,
      back: mockBack,
      canGoBack: mockCanGoBack,
      replace: mockReplace,
    }),
    useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
    Stack: { Screen: () => null },
  };
});
jest.mock("~/hooks/useSearchBarFocus", () => ({
  useSearchBarFocus: () => ({
    searchBarRef: require("react").useRef(null),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
  }),
}));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => mockClient }));
jest.mock("~/lib/agent/create-app-agent", () => ({
  createAppCookingAgent: (...args: unknown[]) => mockCreateAgent(...args),
}));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({
  useRecipes: () => mockUseRecipes(),
}));
jest.mock("~/hooks/queries/usePantryQueries", () => ({
  usePantryItems: () => mockUsePantryItems(),
}));
jest.mock("~/hooks/queries/useFeatureFlags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
}));
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({ mutedForeground: "gray" }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 34 }),
}));
jest.mock("@expo/ui/community/bottom-sheet", () => ({
  __esModule: true,
  default: () => null,
  BottomSheetScrollView: () => null,
}));
jest.mock("@rn-primitives/portal", () => ({ Portal: () => null }));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("lucide-uniwind", () => ({
  SparklesIcon: () => null,
  ArrowUpIcon: () => null,
  SquareIcon: () => null,
  ChevronLeftIcon: () => null,
  ArrowUpRightIcon: () => null,
  ChevronRightIcon: () => null,
}));
jest.mock("~/utils/e2e-flags", () => ({ IS_E2E: true }));
jest.mock("~/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => {
    const { Pressable } = require("react-native");
    return <Pressable {...props}>{children}</Pressable>;
  },
}));
jest.mock("~/components/ui/text", () => ({ Text: (props: any) => <Text {...props} /> }));
jest.mock("~/components/ui/typography", () => ({
  P: (props: any) => <Text {...props} />,
  Small: (props: any) => <Text {...props} />,
  H4: (props: any) => <Text {...props} />,
}));
jest.mock("~/components/ui/separator", () => ({ Separator: () => null }));
jest.mock("../RecipeResults", () => ({
  RecipeResultItem: ({ recipe }: any) => <Text>{recipe.title}</Text>,
}));
jest.mock("../IngredientResults", () => ({
  IngredientResultItem: ({ item }: any) => <Text>{item.name}</Text>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHeaderHeight = 118;
  mockWebSearch = emptyWebSearch;
  mockTurns.length = 0;
  mockCreateAgent.mockImplementation((): CookingAgent => ({
    kind: "nebius",
    async *stream(input) {
      mockTurns.push(input);
      yield { type: "text-delta", text: "Try a rice bowl." };
      yield { type: "finish", text: "Try a rice bowl." };
    },
  }));
});

async function submitAIFromSearch(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  await fireEvent(screen.getByTestId("native-search-input"), "submitEditing");
}

it("keeps the empty Pantry search in place without starting queries during the pull or release", async () => {
  const dismiss = jest.fn();
  const screen = await render(
    <SearchContent onDismiss={dismiss} focusEnabled={false} transparent />
  );
  const preview = screen.getByTestId("search-preview");
  expect(StyleSheet.flatten(preview.props.style).paddingTop).toBe(72);
  expect(screen.queryByTestId("native-search-input")).toBeNull();

  mockHeaderHeight = 62;
  await screen.rerender(<SearchContent onDismiss={dismiss} focusEnabled transparent />);
  expect(screen.getByTestId("search-preview")).toBe(preview);
  expect(StyleSheet.flatten(preview.props.style).paddingTop).toBe(72);
  expect(screen.getByTestId("native-search-input")).toBeTruthy();
  expect(mockUseRecipes).not.toHaveBeenCalled();
  expect(mockUsePantryItems).not.toHaveBeenCalled();
  expect(mockUseFeatureFlag).not.toHaveBeenCalled();
  expect(mockCreateAgent).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByTestId("native-search-input"), "egg");
  expect(screen.getByText("eggs")).toBeTruthy();
  expect(screen.getByText("Egg fried rice")).toBeTruthy();
  expect(mockUseRecipes).toHaveBeenCalled();
  expect(mockUsePantryItems).toHaveBeenCalled();
});

it("switches modes from the separate left circle while retaining the same native input and text", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} transparent />);
  const input = screen.getByTestId("native-search-input");
  await fireEvent.changeText(input, "rice");
  const aiButton = screen.getByLabelText("Switch to Cookkit AI");
  expect(screen.getByTestId("search-mode-symbol").props.name).toBe("sparkles");
  await fireEvent.press(aiButton);
  expect(screen.getByTestId("native-search-input")).toBe(input);
  expect(input.props.value).toBe("rice");
  expect(input.props.placeholder).toBe("Ask Cookkit…");
  expect(screen.queryByTestId(TEST_IDS.assistant.composer)).toBeNull();
  expect(mockCreateAgent).not.toHaveBeenCalled();
  const searchButton = screen.getByLabelText("Switch to search");
  expect(screen.getByTestId("search-mode-symbol").props.name).toBe("magnifyingglass");
  await fireEvent.press(searchButton);
  expect(screen.getByTestId("native-search-input")).toBe(input);
  expect(input.props.value).toBe("rice");
  expect(input.props.placeholder).toBe("Search ingredients and recipes…");
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

it("centers the search helper and leaves preset prompts in AI mode only", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} transparent />);
  const searchHelperStyle = screen.getByText("Search your pantry and recipes.").props.className;
  expect(searchHelperStyle).toContain("text-center");
  expect(searchHelperStyle).toContain("text-lg");
  expect(screen.queryByText("Need a hand?")).toBeNull();
  expect(screen.queryByLabelText("What can I cook?")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  expect(screen.getByText("Ask Cookkit AI").props.className).toBe(searchHelperStyle);
  expect(screen.getByLabelText("What can I cook?")).toBeTruthy();
});

it("hides AI presets while drafting and keeps them hidden after a message is sent", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} initialConversation />);
  const input = screen.getByTestId("native-search-input");
  expect(screen.getByText("Ask Cookkit AI")).toBeTruthy();
  expect(screen.getByTestId("search-assistant-presets")).toBeTruthy();
  await fireEvent.changeText(input, "egg");
  expect(screen.getByText("Ask Cookkit AI")).toBeTruthy();
  expect(screen.queryByTestId("search-assistant-presets")).toBeNull();
  expect(screen.getByTestId("search-assistant-dock")).toBeTruthy();
  await fireEvent.changeText(input, "");
  expect(screen.getByText("Ask Cookkit AI")).toBeTruthy();
  expect(screen.getByTestId("search-assistant-presets")).toBeTruthy();
  await fireEvent.changeText(input, "What can I cook?");
  await fireEvent(input, "submitEditing");
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  expect(input.props.value).toBe("");
  expect(screen.queryByText("Ask Cookkit AI")).toBeNull();
  expect(screen.queryByTestId("search-assistant-presets")).toBeNull();
  expect(screen.getByTestId("search-assistant-dock")).toBeTruthy();
  expect(screen.getByTestId("native-search-input")).toBe(input);
});

it("keeps the mode and close buttons outside the input pill", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} transparent />);
  const input = screen.getByTestId("native-search-input");
  const pill = screen.getByTestId("search-input-pill");
  const mode = screen.getByTestId("search-mode-button");
  const close = screen.getByTestId("search-close-button");
  expect(within(pill).queryByTestId("search-mode-button")).toBeNull();
  expect(within(pill).queryByTestId("search-close-button")).toBeNull();
  expect(StyleSheet.flatten(mode.parent?.props.style).width).toBe(48);
  expect(StyleSheet.flatten(close.parent?.props.style).width).toBe(48);
  expect(screen.queryByTestId("native-search-toolbar")).toBeNull();
  await fireEvent.changeText(input, "egg");
  await fireEvent.press(mode);
  expect(screen.getByTestId("native-search-input")).toBe(input);
  expect(input.props.placeholder).toBe("Ask Cookkit…");
  expect(input.props.value).toBe("egg");
  await fireEvent.press(mode);
  expect(input.props.placeholder).toBe("Search ingredients and recipes…");
  expect(input.props.value).toBe("egg");
  expect(mockCreateAgent).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it("submits to AI or Tavily according to the mode of the same native bar", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} transparent />);
  const input = screen.getByTestId("native-search-input");
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  await fireEvent.changeText(input, "What can I cook?");
  await fireEvent(input, "submitEditing");
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  expect(mockTurns[0]?.messages[0]?.content).toBe("What can I cook?");
  expect(input.props.value).toBe("");
  expect(mockUseWebRecipeSearch).toHaveBeenLastCalledWith("", false);
  await fireEvent.press(screen.getByLabelText("Switch to search"));
  await fireEvent.changeText(input, "rice");
  await fireEvent(input, "submitEditing");
  expect(mockUseWebRecipeSearch).toHaveBeenLastCalledWith("rice", true);
  expect(mockTurns).toHaveLength(1);
  expect(screen.getByTestId("native-search-input")).toBe(input);
});

it("uses a small AI label and keeps wrapping presets above the shared input, outside message scrolling", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} transparent />);
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  expect(screen.queryByText("Cookkit")).toBeNull();
  expect(screen.getByText("Ask Cookkit AI")).toBeTruthy();
  expect(screen.queryByTestId(TEST_IDS.assistant.list)).toBeNull();
  const presets = screen.getByTestId("search-assistant-presets");
  expect(within(presets).getByLabelText("What can I cook?")).toBeTruthy();
  expect(screen.getByTestId("assistant-starter-options").props.className).toContain("flex-wrap");
  await fireEvent.press(within(presets).getByLabelText("What can I cook?"));
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  expect(screen.queryByTestId("search-assistant-presets")).toBeNull();
  expect(
    within(screen.getByTestId(TEST_IDS.assistant.list)).queryByLabelText("What can I cook?")
  ).toBeNull();
  expect(mockTurns[0]?.messages[0]?.content).toBe(
    "What can I cook with the ingredients in my pantry?"
  );
});

it.each(["route", "pantry"])(
  "keeps %s typeahead local and starts web discovery on submission, while AI uses the mode switch",
  async (entry) => {
    const screen = await render(
      entry === "route" ? <SearchScreen /> : <SearchContent onDismiss={mockBack} transparent />
    );
    const input = screen.getByTestId("native-search-input");
    expect(input.props.placeholder).toBe("Search ingredients and recipes…");
    await fireEvent.changeText(input, "egg");
    expect(screen.queryByLabelText("Ask Cookkit")).toBeNull();
    expect(screen.getByText("eggs")).toBeTruthy();
    expect(screen.getByText("Egg fried rice")).toBeTruthy();
    expect(mockCreateAgent).not.toHaveBeenCalled();
    expect(mockUseWebRecipeSearch).toHaveBeenLastCalledWith("", true);
    await fireEvent(input, "submitEditing");
    expect(mockUseWebRecipeSearch).toHaveBeenLastCalledWith("egg", true);
    expect(mockCreateAgent).not.toHaveBeenCalled();
    await submitAIFromSearch(screen);
    await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
    expect(mockCreateAgent).toHaveBeenCalledTimes(1);
    expect(mockTurns[0]?.messages[0]?.content).toBe("egg");
    expect(screen.getByTestId("native-search-input")).toBe(input);
    expect(mockPush).not.toHaveBeenCalled();
  }
);

it.each(["route", "pantry"])(
  "opens a %s web result directly in the recipe skeleton route and guards repeated taps",
  async (entry) => {
    mockWebSearch = {
      ...emptyWebSearch,
      data: [
        {
          url: "https://recipes.test/rice",
          title: "Web rice recipe",
          description: "Fry rice and eggs.",
          source: "recipes.test",
        },
      ],
    };
    const screen = await render(
      entry === "route" ? <SearchScreen /> : <SearchContent onDismiss={mockBack} transparent />
    );
    await fireEvent.changeText(screen.getByTestId("native-search-input"), "rice");
    expect(screen.queryByText("Web rice recipe")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Search the web"));
    const result = screen.getByLabelText("Open recipe Web rice recipe from recipes.test");
    await fireEvent.press(result);
    await fireEvent.press(result);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/recipes/web-import",
      params: { url: "https://recipes.test/rice" },
    });
    await fireEvent.changeText(screen.getByTestId("native-search-input"), "soup");
    expect(screen.queryByText("Web rice recipe")).toBeNull();
  }
);

it("preserves conversation context while switching to search and asking a follow-up", async () => {
  const screen = await render(<SearchScreen />);
  const input = screen.getByTestId("native-search-input");
  await fireEvent.changeText(input, "Help with dinner");
  await submitAIFromSearch(screen);
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Switch to search"));
  expect(screen.queryByText("Try a rice bowl.")).toBeNull();
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "egg");
  expect(screen.getByText("Egg fried rice")).toBeTruthy();
  expect(mockTurns).toHaveLength(1);
  expect(screen.queryByLabelText("Continue conversation")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  expect(screen.getByText("Try a rice bowl.")).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Something quicker please");
  await fireEvent(screen.getByTestId("native-search-input"), "submitEditing");
  await waitFor(() => expect(mockTurns).toHaveLength(2));
  expect(mockCreateAgent).toHaveBeenCalledTimes(1);
  expect(mockTurns[1]?.messages.map((message) => message.content)).toEqual([
    "Help with dinner",
    "Try a rice bowl.",
    "Something quicker please",
  ]);
});

it("stops a response without disabling local search", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockCreateAgent.mockImplementation((): CookingAgent => ({
    kind: "nebius",
    async *stream(input) {
      mockTurns.push(input);
      await blocked;
      yield { type: "text-delta", text: "Late answer" };
    },
  }));
  const screen = await render(<SearchScreen />);
  const input = screen.getByTestId("native-search-input");
  await fireEvent.changeText(input, "Help");
  await submitAIFromSearch(screen);
  await waitFor(() => expect(mockTurns).toHaveLength(1));
  await fireEvent.press(screen.getByLabelText("Switch to search"));
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "egg");
  expect(screen.getByText("Egg fried rice")).toBeTruthy();
  expect(screen.queryByLabelText("Continue conversation")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  await fireEvent.press(screen.getByLabelText("Stop Cookkit"));
  await waitFor(() => expect(mockTurns[0]?.signal?.aborted).toBe(true));
  await act(async () => release());
  expect(screen.queryByText("Late answer")).toBeNull();
});

it("opens verified suggested recipes from the unified conversation", async () => {
  mockCreateAgent.mockImplementation((): CookingAgent => ({
    kind: "nebius",
    async *stream() {
      yield {
        type: "tool-result",
        toolCallId: "recipes",
        toolName: "suggest_recipes",
        output: {
          recipes: [
            {
              id: "verified",
              title: "Rice bowl",
              matched: ["rice"],
              missing: [],
              coverage: 1,
              calories: null,
              tags: [],
            },
          ],
          pantryCount: 1,
          truncated: false,
        },
      };
    },
  }));
  const screen = await render(<SearchScreen />);
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "What can I cook?");
  await submitAIFromSearch(screen);
  await waitFor(() => expect(screen.getByLabelText("Open recipe: Rice bowl")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Open recipe: Rice bowl"));
  expect(mockPush).toHaveBeenCalledWith("/recipes/verified");
});

it("shows assistant failures inline and lets the user make another request", async () => {
  mockCreateAgent.mockImplementation((): CookingAgent => ({
    kind: "nebius",
    async *stream() {
      yield { type: "error", message: "Internal backend failure" };
    },
  }));
  const screen = await render(<SearchScreen />);
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Help");
  await submitAIFromSearch(screen);
  await waitFor(() =>
    expect(screen.getByText("Something went wrong, please try again later")).toBeTruthy()
  );
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Check my pantry");
  expect(screen.getByTestId("native-search-input").props.value).toBe("Check my pantry");
  expect(mockBack).not.toHaveBeenCalled();
});

it("returns direct assistant links safely to Pantry when there is no navigation history", async () => {
  mockCanGoBack.mockReturnValueOnce(false);
  const screen = await render(<SearchScreen />);
  await fireEvent.press(screen.getByLabelText("Close search"));
  expect(mockReplace).toHaveBeenCalledWith("/");
});

it("cancels an active response when the unified search screen unmounts", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockCreateAgent.mockImplementation((): CookingAgent => ({
    kind: "nebius",
    async *stream(input) {
      mockTurns.push(input);
      await blocked;
      yield { type: "text-delta", text: "Late answer" };
    },
  }));
  const screen = await render(<SearchScreen />);
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Help");
  await submitAIFromSearch(screen);
  await waitFor(() => expect(mockTurns).toHaveLength(1));
  await screen.unmount();
  expect(mockTurns[0]?.signal?.aborted).toBe(true);
  await act(async () => release());
});

it("stops an inline assistant response as pull-to-search closes", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockCreateAgent.mockImplementation((): CookingAgent => ({
    kind: "nebius",
    async *stream(input) {
      mockTurns.push(input);
      await blocked;
      yield { type: "text-delta", text: "Late answer" };
    },
  }));
  const screen = await render(<SearchContent onDismiss={mockBack} focusEnabled transparent />);
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Help");
  await submitAIFromSearch(screen);
  await waitFor(() => expect(mockTurns).toHaveLength(1));
  await screen.rerender(<SearchContent onDismiss={mockBack} focusEnabled={false} transparent />);
  await waitFor(() => expect(mockTurns[0]?.signal?.aborted).toBe(true));
  await act(async () => release());
  expect(screen.queryByTestId("native-search-input")).toBeNull();
  expect(screen.queryByText("Late answer")).toBeNull();
});

it.each(["route", "pantry"])(
  "keeps %s assistant controls aligned with that entry's search surface",
  async (entry) => {
    const content =
      entry === "route" ? <SearchScreen /> : <SearchContent onDismiss={mockBack} transparent />;
    const screen = await render(content);
    await fireEvent.changeText(screen.getByTestId("native-search-input"), "Help with dinner");
    expect(
      StyleSheet.flatten(screen.getByTestId("search-results").props.contentContainerStyle)
        .paddingTop
    ).toBe(entry === "pantry" ? 72 : 128);

    await submitAIFromSearch(screen);
    await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
    const conversationHeader = () => screen.getByTestId("search-conversation-header");
    expect(StyleSheet.flatten(conversationHeader().props.style).paddingTop).toBe(72);

    mockHeaderHeight = 144;
    await screen.rerender(React.cloneElement(content));
    expect(StyleSheet.flatten(conversationHeader().props.style).paddingTop).toBe(72);
    await fireEvent.press(screen.getByLabelText("Switch to search"));
    expect(
      StyleSheet.flatten(screen.getByTestId("search-results").props.contentContainerStyle)
        .paddingTop
    ).toBe(entry === "pantry" ? 72 : 154);
  }
);

it("keeps follow-up typing and submission in the same native search bar", async () => {
  const screen = await render(<SearchScreen />);
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Help with dinner");
  await submitAIFromSearch(screen);
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  const composer = screen.getByTestId("native-search-input");
  await fireEvent.changeText(composer, "Something quicker please");
  expect(screen.getByText("Try a rice bowl.")).toBeTruthy();
  expect(screen.getByTestId("native-search-input")).toBe(composer);
  expect(mockTurns).toHaveLength(1);
  await fireEvent(composer, "submitEditing");
  await waitFor(() => expect(mockTurns).toHaveLength(2));
  expect(mockTurns[1]?.messages.at(-1)?.content).toBe("Something quicker please");
});

it("opens a read-only cooking suggestion directly without an extra Ask tap", async () => {
  const screen = await render(<SearchScreen />);
  expect(mockCreateAgent).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  await fireEvent.press(screen.getByLabelText("What can I cook?"));
  await waitFor(() => expect(mockTurns).toHaveLength(1));
  expect(mockTurns[0]?.messages[0]?.content).toBe(
    "What can I cook with the ingredients in my pantry?"
  );
  expect(screen.getByTestId("native-search-input")).toBeTruthy();
});

it("closes the shared search surface from the native X while in AI mode", async () => {
  const screen = await render(<SearchScreen />);
  const input = screen.getByTestId("native-search-input");
  await fireEvent.changeText(input, "Help with dinner");
  await submitAIFromSearch(screen);
  await fireEvent.press(screen.getByLabelText("Close search"));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("native-search-input")).toBe(input);
});

it("supports an AI-mode entry using the same native bar without sending a request", async () => {
  const screen = await render(<SearchContent onDismiss={mockBack} initialConversation />);
  expect(screen.getByTestId("native-search-input").props.placeholder).toBe("Ask Cookkit…");
  expect(screen.getByTestId("native-search-input")).toBeTruthy();
  expect(mockCreateAgent).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("What can I cook?"));
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  expect(mockTurns[0]?.messages[0]?.content).toBe(
    "What can I cook with the ingredients in my pantry?"
  );
  await fireEvent.press(screen.getByLabelText("Switch to search"));
  expect(screen.getByTestId("native-search-input")).toBeTruthy();
  expect(screen.queryByLabelText("Continue conversation")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Switch to Cookkit AI"));
  expect(screen.getByText("Try a rice bowl.")).toBeTruthy();
});
