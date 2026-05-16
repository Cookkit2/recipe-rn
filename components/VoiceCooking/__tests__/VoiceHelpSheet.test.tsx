import { describe, it, expect, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";
import { VoiceHelpSheet } from "../VoiceHelpSheet";

// Mocking @rn-primitives/dialog to simplify testing, since we just want to verify content
jest.mock("~/components/ui/dialog", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  const Dialog = ({ children, open }: any) => {
    if (!open) return null;
    return <View testID="dialog-root">{children}</View>;
  };

  return {
    Dialog,
    DialogContent: ({ children }: any) => <View testID="dialog-content">{children}</View>,
    DialogDescription: ({ children }: any) => <Text testID="dialog-description">{children}</Text>,
    DialogHeader: ({ children }: any) => <View testID="dialog-header">{children}</View>,
    DialogTitle: ({ children }: any) => <Text testID="dialog-title">{children}</Text>,
  };
});

// Mock typography to avoid nested text rendering issues if any
jest.mock("~/components/ui/typography", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    H3: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    H4: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    Muted: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    P: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

describe("VoiceHelpSheet", () => {
  it("renders correctly when open is true", () => {
    const { getByText, getByTestId } = render(
      <VoiceHelpSheet open={true} onOpenChange={jest.fn()} />
    );

    expect(getByTestId("dialog-root")).toBeTruthy();
    expect(getByText("Voice Commands")).toBeTruthy();
    expect(getByText("Say these phrases to control the app hands-free while cooking")).toBeTruthy();
  });

  it("does not render dialog content when open is false", () => {
    const { queryByTestId, queryByText } = render(
      <VoiceHelpSheet open={false} onOpenChange={jest.fn()} />
    );

    expect(queryByTestId("dialog-root")).toBeNull();
    expect(queryByText("Voice Commands")).toBeNull();
  });

  it("renders voice command categories properly", () => {
    const { getByText } = render(<VoiceHelpSheet open={true} onOpenChange={jest.fn()} />);

    // Check for Category Titles
    expect(getByText("Navigation")).toBeTruthy();
    expect(getByText("Step Information")).toBeTruthy();
    expect(getByText("Ingredients")).toBeTruthy();
    expect(getByText("Cooking Info")).toBeTruthy();
    expect(getByText("Voice Control")).toBeTruthy();

    // Check for some specific commands
    expect(getByText('"Next / Continue"')).toBeTruthy();
    expect(getByText("Go to the next step")).toBeTruthy();

    // Check for some example phrases
    expect(getByText('"next step"')).toBeTruthy();
  });
});
