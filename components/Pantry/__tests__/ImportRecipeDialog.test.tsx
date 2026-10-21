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
jest.mock("~/hooks/queries/useRecipeImportQueries", () => ({
  __esModule: true,
  useImportRecipe: () => ({
    importRecipeAsync: mockImportRecipeAsync,
    importStatus: "idle",
    isPending: false,
    reset: mockReset,
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

    await act(async () => fireEvent.press(getByText("Import")));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(mockImportRecipeAsync).toHaveBeenCalledWith(expected);
    expect(mockPush).toHaveBeenCalledWith("/recipes/recipe-42");
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
    await act(async () => fireEvent.press(screen.getByText("Import")));
    await screen.rerender(<ImportRecipeDialog open={false} onOpenChange={jest.fn()} />);
    await act(async () => finish({ success: true, recipe: { id: "old-recipe" } }));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
