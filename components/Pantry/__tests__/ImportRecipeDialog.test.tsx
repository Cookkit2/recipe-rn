import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import React from "react";
import type { SharedRecipeInput } from "~/types/SharedRecipe";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("sonner-native", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Stub UI primitives so no native styling/animations are required.
jest.mock("~/components/ui/button", () => {
  const { Text: RNText, Pressable } = require("react-native");
  const React = require("react");
  return {
    __esModule: true,
    Button: ({ children, onPress, disabled }: any) =>
      React.createElement(
        Pressable,
        {
          onPress: () => {
            void onPress();
          },
          disabled,
          testID: "btn",
        },
        React.isValidElement(children) ? children : React.createElement(RNText, null, children)
      ),
  };
});
jest.mock("~/components/ui/text", () => {
  const { Text: RNText } = require("react-native");
  const React = require("react");
  return {
    __esModule: true,
    Text: (props: any) => React.createElement(RNText, props, props.children),
  };
});
jest.mock("~/components/ui/dialog", () => {
  const React = require("react");
  const { Text: RNText } = require("react-native");
  return {
    __esModule: true,
    Dialog: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogHeader: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogTitle: ({ children }: any) => React.createElement(RNText, null, children),
    DialogDescription: ({ children }: any) => React.createElement(RNText, null, children),
    DialogFooter: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogClose: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});
jest.mock("lucide-uniwind", () => ({ __esModule: true, LinkIcon: () => null }));

// Controllable import hook so the test can drive a successful import.
const mockImportRecipeAsync = jest.fn<(input: SharedRecipeInput) => Promise<any>>();
const mockReset = jest.fn();
const mockSave = jest.fn<(draft: unknown) => Promise<any>>();
const mockReview = jest.fn<(props: any) => any>(() => null);
const mockPick = jest.fn<(...args: any[]) => Promise<any>>();
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: any[]) => mockPick(...args),
}));
jest.mock("~/components/Recipe/RecipeImportReview", () => ({
  __esModule: true,
  default: (props: any) => mockReview(props),
}));
jest.mock("~/hooks/queries/useRecipeImportPreview", () => ({
  __esModule: true,
  useRecipeImportPreview: () => ({
    prepare: async (input: SharedRecipeInput) => {
      const result = await mockImportRecipeAsync(input);
      return result.kind ? result : { kind: "saved", result };
    },
    save: mockSave,
    cancel: mockReset,
    importStatus: "idle",
    isPending: false,
    statusMessage: "Reading video frames...",
  }),
}));

import ImportRecipeDialog from "~/components/Pantry/ImportRecipeDialog";

describe("manual recipe import and failed-share recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["https://example.com/r", { url: "https://example.com/r", text: undefined }],
    ["Fry 2 eggs in oil.", { url: undefined, text: "Fry 2 eggs in oil." }],
    [
      "https://example.com/r\nFry 2 eggs in oil.",
      { url: "https://example.com/r", text: "Fry 2 eggs in oil." },
    ],
  ])("opens recipe details after importing %s", async (content, expected) => {
    mockImportRecipeAsync.mockResolvedValue({
      success: true,
      recipe: { id: "recipe-42", title: "Soup" },
    });

    const { getByText, getByTestId } = await render(
      <ImportRecipeDialog open={true} onOpenChange={jest.fn()} />
    );

    const input = getByTestId("import-recipe-content-input");
    await act(async () => {
      fireEvent.changeText(input, content);
    });

    await act(async () => fireEvent.press(getByText("Continue")));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(mockImportRecipeAsync).toHaveBeenCalledWith(expected);
    expect(mockPush).toHaveBeenCalledWith("/recipes/recipe-42");
  });

  it("shows a review without navigating or saving, then saves the corrected draft", async () => {
    const draft = { recipe: { title: "Eggs" }, warnings: ["Missing amounts"] };
    mockImportRecipeAsync.mockResolvedValue({ kind: "review", draft });
    mockSave.mockResolvedValue({ success: true, recipe: { id: "reviewed" } });
    const screen = await render(
      <ImportRecipeDialog
        open
        onOpenChange={jest.fn()}
        initialInput={{ url: "https://vt.tiktok.com/ZSgH2hh7B/" }}
      />
    );
    await act(async () => fireEvent.press(screen.getByText("Continue")));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
    const props = mockReview.mock.calls.at(-1)?.[0];
    expect(props.draft).toBe(draft);
    await act(async () => props.onSave(draft));
    expect(mockSave).toHaveBeenCalledWith(draft);
    expect(mockPush).toHaveBeenCalledWith("/recipes/reviewed");
  });

  it("keeps the TikTok link and caption when choosing a local video", async () => {
    const url = "https://vt.tiktok.com/ZSgH2hh7B/";
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///picked.mp4", fileSize: 2000, duration: 18000 }],
    });
    mockImportRecipeAsync.mockResolvedValue({
      kind: "review",
      draft: { recipe: { title: "Eggs" }, warnings: [] },
    });
    const screen = await render(
      <ImportRecipeDialog open onOpenChange={jest.fn()} initialInput={{ url, text: "5 eggs" }} />
    );
    await act(async () => fireEvent.press(screen.getByText("Choose video")));
    await act(async () => fireEvent.press(screen.getByText("Continue")));
    expect(mockImportRecipeAsync).toHaveBeenCalledWith({
      url,
      text: "5 eggs",
      videoUri: "file:///picked.mp4",
      language: "en-US",
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("keeps the shared source available for a recovery attempt", async () => {
    const screen = await render(
      <ImportRecipeDialog
        open
        onOpenChange={jest.fn()}
        initialInput={{ url: "https://example.com/r", text: "Fry 2 eggs in oil." }}
      />
    );
    expect(screen.getByTestId("import-recipe-content-input").props.value).toBe(
      "https://example.com/r\n\nFry 2 eggs in oil."
    );
  });

  it("does not navigate from an import that finishes after the dialog is closed", async () => {
    let finish!: (value: unknown) => void;
    mockImportRecipeAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = await render(<ImportRecipeDialog open onOpenChange={jest.fn()} />);
    await act(async () =>
      fireEvent.changeText(
        screen.getByTestId("import-recipe-content-input"),
        "https://example.com/r"
      )
    );
    await act(async () => fireEvent.press(screen.getByText("Continue")));
    await screen.rerender(<ImportRecipeDialog open={false} onOpenChange={jest.fn()} />);
    await act(async () => finish({ success: true, recipe: { id: "old-recipe" } }));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
