import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import type { PendingRecipeShare, SharedRecipeInput } from "~/types/SharedRecipe";

let mockPending: PendingRecipeShare | null = null;
let mockShareId: string | undefined;
const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) };
const mockImport = jest.fn(async (_input: SharedRecipeInput) => ({
  success: true,
  recipe: { id: "recipe-1" },
}));
const mockClear = jest.fn((id: string) => {
  if (mockPending?.id === id) mockPending = null;
});
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ shareId: mockShareId }),
}));
jest.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 100 }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 34 }) }));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => mockPending,
  clearPendingRecipeShare: (id: string) => mockClear(id),
}));
jest.mock("~/hooks/queries/useRecipeImportQueries", () => ({
  useImportRecipe: () => ({
    importRecipeAsync: mockImport,
    isPending: false,
    importStatus: "idle",
  }),
  getImportStatusMessage: () => "Reading recipe...",
}));
jest.mock("~/components/ui/button", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    Button: ({
      onPress,
      children,
    }: {
      onPress: () => Promise<void> | void;
      children: React.ReactNode;
    }) =>
      React.createElement(
        Pressable,
        {
          onPress: () => {
            void onPress();
          },
        },
        children
      ),
  };
});
jest.mock("~/components/ui/input", () => ({ Input: require("react-native").TextInput }));
jest.mock("~/components/ui/typography", () => ({ P: require("react-native").Text }));

import ImportRecipePage from "~/app/import-recipe";

beforeEach(() => {
  jest.clearAllMocks();
  mockPending = { id: "first", text: "Fry 2 eggs in oil.", url: "https://example.com/eggs" };
  mockShareId = "first";
  mockImport.mockResolvedValue({ success: true, recipe: { id: "recipe-1" } });
});

it("replaces the fields when another share arrives on the open import screen", async () => {
  const screen = await render(<ImportRecipePage />);
  expect(screen.getByLabelText("Recipe caption").props.value).toBe(mockPending?.text);
  mockPending = { id: "second", text: "Boil pasta with pesto." };
  mockShareId = "second";
  await screen.rerender(<ImportRecipePage />);
  expect(screen.getByLabelText("Recipe caption").props.value).toBe("Boil pasta with pesto.");
  expect(screen.getByLabelText("Recipe URL").props.value).toBe("");
});

it("keeps a newer share open if the previous extraction finishes late", async () => {
  let finish!: (result: { success: boolean; recipe: { id: string } }) => void;
  mockImport.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(<ImportRecipePage />);
  await act(async () => fireEvent.press(screen.getByText("Extract recipe")));
  mockPending = { id: "second", text: "Boil pasta with pesto." };
  mockShareId = "second";
  await screen.rerender(<ImportRecipePage />);
  await act(async () => finish({ success: true, recipe: { id: "old-recipe" } }));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockPending?.id).toBe("second");
});

it("keeps the newest payload if native linking restores an older share parameter", async () => {
  const screen = await render(<ImportRecipePage />);
  mockPending = { id: "second", text: "Boil pasta with pesto." };
  mockShareId = "second";
  await screen.rerender(<ImportRecipePage />);
  mockShareId = "first";
  await screen.rerender(<ImportRecipePage />);
  expect(screen.getByLabelText("Recipe caption").props.value).toBe("Boil pasta with pesto.");
});

it("opens a successful extraction for editing and consumes only that share", async () => {
  const screen = await render(<ImportRecipePage />);
  await act(async () => fireEvent.press(screen.getByText("Extract recipe")));
  expect(mockImport).toHaveBeenCalledWith({
    url: "https://example.com/eggs",
    text: "Fry 2 eggs in oil.",
  });
  expect(mockClear).toHaveBeenCalledWith("first");
  expect(mockRouter.replace).toHaveBeenCalledWith("/recipes/recipe-1/edit");
});

it("returns home when cancelling a cold-start share without navigation history", async () => {
  const screen = await render(<ImportRecipePage />);
  await act(async () => fireEvent.press(screen.getByText("Cancel")));
  expect(mockPending).toBeNull();
  expect(mockRouter.replace).toHaveBeenCalledWith("/");
});
