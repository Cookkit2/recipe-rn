import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { View } from "react-native";
import type { PendingRecipeShare } from "~/types/SharedRecipe";
const source = { id: "share-1", url: "https://www.instagram.com/reel/Db18zFIR5k-/" };
let mockPending: PendingRecipeShare | null = source;
const mockPrepare = jest.fn();
const mockSave = jest.fn();
const mockReplace = jest.fn();
const mockClear = jest.fn((id: string) => {
  if (mockPending?.id === id) mockPending = null;
});
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 20 }),
}));
jest.mock("~/hooks/queries/useRecipeImportPreview", () => ({
  useRecipeImportPreview: () => ({
    prepare: mockPrepare,
    save: mockSave,
    statusMessage: "Reading video frames…",
  }),
}));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => mockPending,
  clearPendingRecipeShare: (id: string) => mockClear(id),
}));
jest.mock("../Details/RecipeDetailsSkeleton", () => ({
  __esModule: true,
  default: ({ message }: { message: string }) => (
    <View testID="recipe-skeleton" accessibilityLabel={message} />
  ),
}));
jest.mock("~/components/ui/button", () => {
  const { Pressable } = jest.requireActual("react-native");
  return { Button: Pressable };
});
jest.mock("~/components/ui/typography", () => {
  const { Text } = jest.requireActual("react-native");
  return { H2: Text, P: Text };
});
import SharedRecipeImport from "../SharedRecipeImport";
beforeEach(() => {
  jest.clearAllMocks();
  mockPending = source;
  mockPrepare.mockReset();
});
it("shows the normal recipe skeleton immediately and replaces it with the saved recipe", async () => {
  let finish!: (value: unknown) => void;
  mockPrepare.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(<SharedRecipeImport pending={source} />);
  expect(screen.getByTestId("recipe-skeleton")).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled();
  await act(async () =>
    finish({ kind: "saved", result: { success: true, recipe: { id: "peach" } } })
  );
  expect(mockReplace).toHaveBeenCalledWith("/recipes/peach");
  expect(mockClear).toHaveBeenCalledWith("share-1");
});
it("retains the original share and offers inline retry without a fill-in form", async () => {
  mockPrepare.mockRejectedValueOnce(new Error("Video temporarily unavailable"));
  const screen = await render(<SharedRecipeImport pending={source} />);
  await waitFor(() => expect(screen.getByText("Video temporarily unavailable")).toBeTruthy());
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  mockPrepare.mockResolvedValueOnce({
    kind: "saved",
    result: { success: true, recipe: { id: "peach" } },
  });
  await fireEvent.press(screen.getByText("Try again"));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/recipes/peach"));
  expect(mockPrepare).toHaveBeenCalledTimes(2);
});
it("does not open an obsolete recipe after a newer share arrives", async () => {
  let finish!: (value: unknown) => void;
  mockPrepare.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  await render(<SharedRecipeImport pending={source} />);
  mockPending = { ...source, id: "share-2" };
  await act(async () =>
    finish({ kind: "saved", result: { success: true, recipe: { id: "old" } } })
  );
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled();
});
it("starts one extraction across Strict Mode effect replay", async () => {
  mockPrepare.mockResolvedValue({
    kind: "saved",
    result: { success: true, recipe: { id: "peach" } },
  });
  await render(
    <React.StrictMode>
      <SharedRecipeImport pending={source} />
    </React.StrictMode>
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  expect(mockPrepare).toHaveBeenCalledTimes(1);
});
