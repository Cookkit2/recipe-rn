/**
 * Editability test for ImportRecipeDialog (issue #730).
 *
 * Asserts that a successfully imported recipe is routed to the EDIT screen
 * (`/recipes/${id}/edit`), not the view screen — so any mis-parsed
 * ingredient/step is correctable before save.
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { TextInput } from "react-native";
import React from "react";

const pushMock = jest.fn();

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn() }),
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
        { onPress, disabled, testID: "btn" },
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
  return {
    __esModule: true,
    Dialog: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogHeader: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogTitle: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogDescription: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogFooter: ({ children }: any) => React.createElement(React.Fragment, null, children),
    DialogClose: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});
jest.mock("lucide-uniwind", () => ({ __esModule: true, LinkIcon: () => null }));

// Controllable import hook so the test can drive a successful import.
const importRecipeAsync = jest.fn<(url: string) => Promise<any>>();
const reset = jest.fn();
jest.mock("~/hooks/queries/useRecipeImportQueries", () => ({
  __esModule: true,
  useImportRecipe: () => ({
    importRecipeAsync,
    importStatus: "idle",
    isPending: false,
    reset,
  }),
}));

import ImportRecipeDialog from "~/components/Pantry/ImportRecipeDialog";

describe("ImportRecipeDialog routing (always-editable)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes to the EDIT screen on a successful import", async () => {
    importRecipeAsync.mockResolvedValue({
      success: true,
      recipe: { id: "recipe-42", title: "Soup" },
    });

    const { getAllByTestId, UNSAFE_getByType } = render(
      <ImportRecipeDialog open={true} onOpenChange={jest.fn()} />
    );

    const input = UNSAFE_getByType(TextInput);
    fireEvent.changeText(input, "https://example.com/r");

    // The Import button is the second testID="btn" (Cancel is first).
    const buttons = getAllByTestId("btn");
    const importButton = buttons[buttons.length - 1];
    if (importButton) {
      fireEvent.press(importButton);
    }

    // Flush the async handleSubmit.
    await Promise.resolve();
    await Promise.resolve();

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/recipes/recipe-42/edit");
    // Sanity: must NOT route to the view screen.
    expect(pushMock).not.toHaveBeenCalledWith("/recipes/recipe-42");
  });
});
