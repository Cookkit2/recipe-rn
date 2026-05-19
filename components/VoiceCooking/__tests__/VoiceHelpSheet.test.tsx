import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { VoiceHelpSheet } from "../VoiceHelpSheet";

// Mock the dialog components
jest.mock("~/components/ui/dialog", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  return {
    Dialog: ({ children, open, onOpenChange }: any) =>
      open ? <View testID="dialog-root">{children}</View> : null,
    DialogContent: ({ children, className }: any) => (
      <View testID="dialog-content">{children}</View>
    ),
    DialogHeader: ({ children }: any) => <View testID="dialog-header">{children}</View>,
    DialogTitle: ({ children, className }: any) => <Text testID="dialog-title">{children}</Text>,
    DialogDescription: ({ children }: any) => <Text testID="dialog-description">{children}</Text>,
  };
});

// Mock typography components
jest.mock("~/components/ui/typography", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    H3: ({ children, className }: any) => <Text testID="typography-h3">{children}</Text>,
    H4: ({ children, className }: any) => <Text testID="typography-h4">{children}</Text>,
    P: ({ children, className }: any) => <Text testID="typography-p">{children}</Text>,
    Muted: ({ children, className }: any) => <Text testID="typography-muted">{children}</Text>,
  };
});

describe("VoiceHelpSheet", () => {
  it("should not render when open is false", () => {
    const { queryByTestId } = render(<VoiceHelpSheet open={false} onOpenChange={jest.fn()} />);
    expect(queryByTestId("dialog-root")).toBeNull();
  });

  it("should render when open is true", () => {
    const { getByTestId } = render(<VoiceHelpSheet open={true} onOpenChange={jest.fn()} />);
    expect(getByTestId("dialog-root")).toBeTruthy();
    expect(getByTestId("dialog-title").props.children).toBe("Voice Commands");
  });

  it("should render all category titles", () => {
    const { getAllByTestId } = render(<VoiceHelpSheet open={true} onOpenChange={jest.fn()} />);

    const h3Elements = getAllByTestId("typography-h3");
    const categoryTitles = h3Elements.map((el) => el.props.children);

    expect(categoryTitles).toContain("Navigation");
    expect(categoryTitles).toContain("Step Information");
    expect(categoryTitles).toContain("Ingredients");
    expect(categoryTitles).toContain("Cooking Info");
    expect(categoryTitles).toContain("Voice Control");
  });

  it("should render specific command phrases", () => {
    const { getAllByTestId } = render(<VoiceHelpSheet open={true} onOpenChange={jest.fn()} />);

    const h4Elements = getAllByTestId("typography-h4");
    // Elements render as '"{command.phrase}"' due to the formatting in component
    const commandPhrases = h4Elements.map((el) => el.props.children.join(""));

    expect(commandPhrases).toContain('"Next / Continue"');
    expect(commandPhrases).toContain('"Repeat / Read"');
    expect(commandPhrases).toContain('"Stop / Quiet"');
  });
});
