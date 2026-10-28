import React from "react";
import { Platform, StyleSheet } from "react-native";
import { fireEvent, render, waitFor, userEvent } from "@testing-library/react-native";
import type { CookingChatMessage } from "~/hooks/useCookingAgentChat";
import { PantryActionCard } from "../PantryActionCard";
import { AssistantChat } from "../AssistantChat";
import { AssistantMessages } from "../AssistantMessages";
import { TEST_IDS } from "~/constants/test-ids";
import type { CookingAgent } from "~/lib/agent/types";
import * as e2eFlags from "~/utils/e2e-flags";

jest.mock("~/components/Pantry/RecipeItemCard", () => ({
  __esModule: true,
  default: ({ recipe }: any) =>
    require("react").createElement(require("react-native").Text, null, recipe.title),
}));
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
  expect(screen.getByText("Matches your pantry")).toBeTruthy();
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
  expect(screen.queryByText("Matches your pantry")).toBeNull();
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

it("renders ingredient choices as buttons without exposing their row identifiers", async () => {
  const reply = jest.fn();
  const screen = await render(
    <AssistantMessages
      messages={[
        {
          id: "choose",
          role: "assistant",
          content: "Which eggs?\nEntry 1: Eggs, 6 pcs, fridge",
          activities: [],
          pantryClarification: {
            question: "Which eggs?",
            candidates: [
              {
                id: "private-row-id",
                name: "Eggs",
                quantity: 6,
                unit: "pcs",
                storageType: "fridge",
                expiryDate: null,
              },
            ],
          },
        },
      ]}
      onReply={reply}
    />
  );
  await fireEvent.press(screen.getByLabelText("Choose Eggs, 6 pcs, fridge"));
  expect(reply).toHaveBeenCalledWith("Entry 1");
  expect(screen.queryByText(/private-row-id|Entry 1:/)).toBeNull();
});

it("keeps older messages in place while new reply content arrives", async () => {
  const messages: CookingChatMessage[] = [
    { id: "reply", role: "assistant", content: "Dinner ideas", activities: [] },
  ];
  const screen = await render(<AssistantMessages messages={messages} streaming />);
  const list = screen.getByTestId(TEST_IDS.assistant.list);
  const user = userEvent.setup();
  await user.scrollTo(list, {
    y: 100,
    contentSize: { width: 400, height: 2000 },
    layoutMeasurement: { width: 400, height: 600 },
  });
  const content = list.children[0];
  if (!content || typeof content === "string") throw new Error("Missing native scroll content");
  await fireEvent(content, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 2100 } },
  });
  expect(screen.getByLabelText("Jump to latest message")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Jump to latest message"));
  expect(screen.queryByLabelText("Jump to latest message")).toBeNull();
});

it("offers Retry for a read failure but Review pantry for an uncertain write", async () => {
  const reply = jest.fn();
  const messages: CookingChatMessage[] = [
    { id: "question", role: "user", content: "What can I cook?", activities: [] },
    { id: "failed", role: "assistant", content: "", error: "Unable to connect.", activities: [] },
  ];
  const screen = await render(
    <AssistantMessages messages={messages} onReply={reply} onViewPantry={jest.fn()} />
  );
  await fireEvent.press(screen.getByLabelText("Retry message"));
  expect(reply).toHaveBeenCalledWith("What can I cook?");
  await screen.rerender(
    <AssistantMessages
      messages={[
        messages[0]!,
        { ...messages[1]!, pantryError: "A pantry update may still finish." },
      ]}
      onReply={reply}
      onViewPantry={jest.fn()}
    />
  );
  expect(screen.queryByLabelText("Retry message")).toBeNull();
  expect(screen.getByText("Review pantry")).toBeTruthy();
});

it("only marks an addition undone after the Undo operation succeeds", async () => {
  const undo = jest.fn().mockResolvedValue(undefined);
  const action = {
    id: "change",
    status: "added" as const,
    items: [
      {
        id: "carrot",
        name: "Carrot",
        quantity: 2,
        unit: "pcs",
        storageType: "fridge",
        updatedAt: "2026-10-28T10:00:00.000Z",
      },
    ],
  };
  const screen = await render(<PantryActionCard action={action} onUndo={undo} />);
  await fireEvent.press(screen.getByLabelText("Undo pantry addition"));
  await waitFor(() => expect(screen.getByText("Addition undone")).toBeTruthy());
  expect(undo).toHaveBeenCalledWith(action.items[0]);
  await screen.rerender(
    <PantryActionCard key="remounted" action={{ ...action, undone: true }} onUndo={undo} />
  );
  expect(screen.queryByLabelText("Undo pantry addition")).toBeNull();
  expect(screen.getByText("Addition undone")).toBeTruthy();
});
