import React from "react";
import { Platform, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { CookingChatMessage } from "~/hooks/useCookingAgentChat";
import { AssistantChat } from "../AssistantChat";
import { AssistantMessages } from "../AssistantMessages";
import { TEST_IDS } from "~/constants/test-ids";
import type { CookingAgent } from "~/lib/agent/types";
import * as e2eFlags from "~/utils/e2e-flags";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 103 }));

const chatMessages: CookingChatMessage[] = [];
beforeEach(() => {
  chatMessages.length = 0;
});

jest.mock("~/hooks/useCookingAgentChat", () => ({
  useCookingAgentChat: () => ({
    messages: chatMessages,
    status: "idle",
    send: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock("~/utils/e2e-flags", () => ({ __esModule: true, IS_E2E: true }));

const agent = {
  kind: "nebius",
  stream: () => (async function* () {})(),
} as CookingAgent;

it("renders a stable assistant composer above the home indicator in E2E", async () => {
  const screen = await render(<AssistantChat agent={agent} />);

  const root = screen.getByTestId(TEST_IDS.assistant.screen);
  expect(root.props.behavior).toBeUndefined();
  expect(StyleSheet.flatten(root.props.style)).toMatchObject({ flex: 1 });

  const composer = screen.getByTestId(TEST_IDS.assistant.composer);
  expect(composer.props.multiline).toBe(false);
  expect(composer.props.scrollEnabled).toBe(false);
  expect(StyleSheet.flatten(composer.props.style)).toMatchObject({
    height: 48,
    maxHeight: 48,
  });
  expect(screen.getByTestId(TEST_IDS.assistant.list).props.contentContainerStyle).toMatchObject({
    paddingTop: 12,
  });

  const barStyle = StyleSheet.flatten(composer.parent?.props.style);
  expect(barStyle).toMatchObject({
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingBottom: 46,
    flexShrink: 0,
  });
});

it("keeps the production composer in keyboard-adjusted layout flow", async () => {
  jest.replaceProperty(e2eFlags, "IS_E2E", false);
  jest.replaceProperty(Platform, "OS", "ios");
  try {
    const screen = await render(<AssistantChat agent={agent} />);
    const composer = screen.getByTestId(TEST_IDS.assistant.composer);
    expect(StyleSheet.flatten(composer.parent?.props.style).position).not.toBe("absolute");
    expect(
      screen.getByTestId(TEST_IDS.assistant.list).props.contentContainerStyle.paddingBottom
    ).toBe(12);
  } finally {
    jest.restoreAllMocks();
  }
});

it("groups verified recipes and shows all missing ingredients and quantity caveat", async () => {
  const message = {
    id: "a1",
    role: "assistant" as const,
    content: "",
    activities: [],
    recipeSuggestions: {
      recipes: [
        {
          id: "r1",
          title: "Boiled eggs",
          matched: ["eggs"],
          missing: [],
          coverage: 1,
          calories: null,
          tags: [],
        },
        {
          id: "r2",
          title: "Spinach omelette",
          matched: ["eggs"],
          missing: ["spinach", "cheese"],
          coverage: 1 / 3,
          calories: null,
          tags: [],
        },
      ],
      pantryCount: 1,
      truncated: true,
    },
  };
  chatMessages.push(message);
  const screen = await render(<AssistantChat agent={agent} />);
  expect(screen.getByText("Ready to cook")).toBeTruthy();
  expect(screen.getByText("Needs extra ingredients")).toBeTruthy();
  expect(screen.getByText("Boiled eggs")).toBeTruthy();
  expect(screen.getAllByText("Have: eggs")[0]).toBeTruthy();
  expect(screen.getByText("Need: spinach, cheese")).toBeTruthy();
  expect(
    screen.getByText("Ingredient names matched; quantities haven't been checked.")
  ).toBeTruthy();
  expect(screen.getByText("Matches are from part of the recipe catalog.")).toBeTruthy();
});

it("shows an empty catalog result without substituting a recipe", async () => {
  const message = {
    id: "empty",
    role: "assistant" as const,
    content: "",
    activities: [],
    recipeSuggestions: { recipes: [], pantryCount: 1, truncated: false },
  };
  chatMessages.push(message);
  const screen = await render(<AssistantChat agent={agent} />);
  expect(screen.getByText("No matching recipes found in the available catalog.")).toBeTruthy();
  expect(screen.queryByText("Ready to cook")).toBeNull();
});

it("shows a pantry error beside verified recipe results", async () => {
  const message = {
    id: "mixed",
    role: "assistant" as const,
    content: "",
    activities: [],
    error: "A pantry update may still finish. Check your pantry before trying again.",
    recipeSuggestions: { recipes: [], pantryCount: 1, truncated: false },
  };
  chatMessages.push(message);
  const screen = await render(<AssistantChat agent={agent} />);
  expect(screen.getByText(message.error)).toBeTruthy();
});

it("shows assistant Markdown as plain text while preserving the user's message", async () => {
  chatMessages.push(
    { id: "user-format", role: "user", content: "Check **eggs**", activities: [] },
    {
      id: "assistant-format",
      role: "assistant",
      content: "Your saved allergens include **eggs**, and you have eggs.",
      activities: [],
    }
  );
  const screen = await render(<AssistantChat agent={agent} />);
  expect(screen.getByText("Your saved allergens include eggs, and you have eggs.")).toBeTruthy();
  expect(screen.getByText("Check **eggs**")).toBeTruthy();
});

it("hides unfinished emphasis markers during streaming", async () => {
  chatMessages.push({ id: "partial", role: "assistant", content: "You have **eg", activities: [] });
  const screen = await render(<AssistantChat agent={agent} />);
  expect(screen.getByText("You have eg")).toBeTruthy();
});

it("shows pantry rows alongside recipe cards for a combined read and suggestion", async () => {
  chatMessages.push({
    id: "combined",
    role: "assistant",
    content: "Pantry (entries 1–1 of 1):\nEggs: 6 pcs",
    activities: ["Read pantry", "Matched recipes"],
    pantryReadStatus: "complete",
    pantryReadPages: [
      {
        items: [{ id: "eggs", name: "Eggs", quantity: 6, unit: "pcs", expiryDate: null }],
        totalCount: 1,
        offset: 0,
        truncated: false,
      },
    ],
    recipeSuggestions: { recipes: [], pantryCount: 1, truncated: false },
  });
  const screen = await render(<AssistantChat agent={agent} />);
  expect(screen.getByText("Pantry (entries 1–1 of 1):\nEggs: 6 pcs")).toBeTruthy();
  expect(screen.getByText("No matching recipes found in the available catalog.")).toBeTruthy();
});

it("never renders stock identifiers from assistant prose, errors, or recipe card labels", async () => {
  const stockId = "opaque-eggs-123";
  chatMessages.push({
    id: "internal-stock",
    role: "assistant",
    content: `Eggs (stockId: ${stockId})\nMilk: opaque-milk-456`,
    activities: [],
    internalStockIds: [stockId, "opaque-milk-456"],
    pantryError: `Try again (stockId: ${stockId})`,
    recipeSuggestions: {
      recipes: [
        {
          id: "recipe-123",
          title: `Egg dish (stockId: ${stockId})`,
          matched: [`eggs (stock_id: ${stockId})`],
          missing: [],
          coverage: 1,
          calories: null,
          tags: [],
        },
      ],
      pantryCount: 2,
      truncated: false,
    },
  });
  const openRecipe = jest.fn();
  const screen = await render(
    <AssistantMessages messages={chatMessages} onOpenRecipe={openRecipe} />
  );
  expect(screen.queryAllByText(/opaque-eggs-123|opaque-milk-456|stockId|stock_id/)).toHaveLength(0);
  expect(
    screen.queryAllByLabelText(/opaque-eggs-123|opaque-milk-456|stockId|stock_id/)
  ).toHaveLength(0);
  expect(screen.getByText("Egg dish")).toBeTruthy();
  expect(screen.getByText("Have: eggs")).toBeTruthy();
  // Internal IDs still drive navigation and subsequent stock selection.
  fireEvent.press(screen.getByLabelText("Open recipe: Egg dish"));
  expect(openRecipe).toHaveBeenCalledWith("recipe-123");
  expect(chatMessages[0]?.recipeSuggestions?.recipes[0]?.id).toBe("recipe-123");
});
