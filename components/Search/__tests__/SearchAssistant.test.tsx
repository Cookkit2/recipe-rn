import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import SearchScreen from "~/app/(misc)/search";
import { SearchContent } from "../SearchContent";
import type { CookingAgent, AgentTurnInput } from "~/lib/agent/types";
import { TEST_IDS } from "~/constants/test-ids";

let mockHeaderHeight = 118;
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
jest.mock("react-native", () =>
  Object.defineProperties(Object.create(jest.requireActual("react-native")), {
    BackHandler: { value: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } },
  })
);
jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    useRouter: () => ({
      push: mockPush,
      back: mockBack,
      canGoBack: mockCanGoBack,
      replace: mockReplace,
    }),
    useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
    Stack: {
      Screen: () => null,
      SearchBar: React.forwardRef(
        ({ onChangeText, onSearchButtonPress, ...props }: any, ref: any) => {
          const [value, setValue] = React.useState("");
          React.useImperativeHandle(ref, () => ({
            focus: jest.fn(),
            clearText: () => setValue(""),
          }));
          return (
            <View
              {...props}
              testID="native-search-input"
              value={value}
              onChangeText={(text: string) => {
                setValue(text);
                onChangeText({ nativeEvent: { text } });
              }}
              onSubmitEditing={() => onSearchButtonPress({ nativeEvent: { text: value } })}
            />
          );
        }
      ),
    },
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
  useRecipes: () => ({ data: mockRecipes, isPending: false }),
}));
jest.mock("~/hooks/queries/usePantryQueries", () => ({
  usePantryItems: () => ({ data: mockPantry, isPending: false }),
}));
jest.mock("~/hooks/queries/useFeatureFlags", () => ({
  useFeatureFlag: () => ({ enabled: false }),
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
jest.mock("lucide-uniwind", () => ({ SparklesIcon: () => null }));
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

it.each(["route", "pantry"])(
  "keeps %s typeahead and keyboard search local until Ask Cookkit is pressed",
  async (entry) => {
    const screen = await render(
      entry === "route" ? <SearchScreen /> : <SearchContent onDismiss={mockBack} transparent />
    );
    const input = screen.getByTestId("native-search-input");
    expect(input.props.placeholder).toBe("Search or ask Cookkit…");
    await fireEvent.changeText(input, "egg");
    expect(screen.getByText("eggs")).toBeTruthy();
    expect(screen.getByText("Egg fried rice")).toBeTruthy();
    expect(mockCreateAgent).not.toHaveBeenCalled();
    await fireEvent(input, "submitEditing");
    expect(mockCreateAgent).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId(TEST_IDS.search.askAssistant));
    await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
    expect(mockCreateAgent).toHaveBeenCalledTimes(1);
    expect(mockTurns[0]?.messages[0]?.content).toBe("egg");
    expect(screen.getByTestId("native-search-input").props.value).toBe("");
    expect(mockPush).not.toHaveBeenCalled();
  }
);

it("preserves conversation context while switching to search and asking a follow-up", async () => {
  const screen = await render(<SearchScreen />);
  const input = screen.getByTestId("native-search-input");
  await fireEvent.changeText(input, "Help with dinner");
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
  await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
  await fireEvent.press(screen.getByText("Search results"));
  expect(screen.queryByText("Try a rice bowl.")).toBeNull();
  await fireEvent.changeText(input, "egg");
  expect(screen.getByText("Egg fried rice")).toBeTruthy();
  expect(mockTurns).toHaveLength(1);
  await fireEvent.press(screen.getByText("Cookkit"));
  expect(screen.getByText("Try a rice bowl.")).toBeTruthy();
  await fireEvent.changeText(input, "Something quicker please");
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
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
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
  await waitFor(() => expect(mockTurns).toHaveLength(1));
  await fireEvent.changeText(input, "egg");
  expect(screen.getByText("Egg fried rice")).toBeTruthy();
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
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
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
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
  await waitFor(() =>
    expect(screen.getByText("Something went wrong, please try again later")).toBeTruthy()
  );
  await fireEvent.changeText(screen.getByTestId("native-search-input"), "Check my pantry");
  expect(screen.getByLabelText("Ask Cookkit")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it("returns direct assistant links safely to Pantry when there is no navigation history", async () => {
  mockCanGoBack.mockReturnValueOnce(false);
  const screen = await render(<SearchScreen />);
  await fireEvent(screen.getByTestId("native-search-input"), "cancelButtonPress");
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
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
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
  await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
  await waitFor(() => expect(mockTurns).toHaveLength(1));
  await screen.rerender(<SearchContent onDismiss={mockBack} focusEnabled={false} transparent />);
  await waitFor(() => expect(mockTurns[0]?.signal?.aborted).toBe(true));
  await act(async () => release());
  expect(screen.queryByTestId("native-search-input")).toBeNull();
  expect(screen.queryByText("Late answer")).toBeNull();
});

it.each(["route", "pantry"])(
  "keeps %s assistant controls below the native search header as its height changes",
  async (entry) => {
    const content =
      entry === "route" ? <SearchScreen /> : <SearchContent onDismiss={mockBack} transparent />;
    const screen = await render(content);
    await fireEvent.changeText(screen.getByTestId("native-search-input"), "Help with dinner");
    expect(
      StyleSheet.flatten(screen.getByTestId("search-results").props.contentContainerStyle)
        .paddingTop
    ).toBe(128);

    await fireEvent.press(screen.getByLabelText("Ask Cookkit"));
    await waitFor(() => expect(screen.getByText("Try a rice bowl.")).toBeTruthy());
    const conversationHeader = () => screen.getByTestId("search-conversation-header");
    expect(StyleSheet.flatten(conversationHeader().props.style).paddingTop).toBe(128);

    mockHeaderHeight = 144;
    await screen.rerender(React.cloneElement(content));
    expect(StyleSheet.flatten(conversationHeader().props.style).paddingTop).toBe(154);
    await fireEvent.press(screen.getByText("Search results"));
    expect(
      StyleSheet.flatten(screen.getByTestId("search-results").props.contentContainerStyle)
        .paddingTop
    ).toBe(154);
  }
);
