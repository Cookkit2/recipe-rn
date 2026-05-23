import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { Text, View } from "react-native";
import ListButton from "../ListButton";
import { type LucidePropsWithClassName } from "lucide-uniwind";

// Mock dependencies
jest.mock("~/components/ui/button", () => {
  const React = require("react");
  const { TouchableOpacity } = require("react-native");
  return {
    __esModule: true,
    Button: ({
      children,
      onPress,
      testID,
      variant,
      className,
      size,
      enableAnimation,
      ...props
    }: any) => {
      return (
        <TouchableOpacity onPress={onPress} testID={testID || "mock-button"} {...props}>
          {children}
        </TouchableOpacity>
      );
    },
  };
});

jest.mock("~/components/ui/typography", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    P: ({ children, className }: any) => <Text>{children}</Text>,
  };
});

jest.mock("lucide-uniwind", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    ArrowUpRightIcon: () => <Text testID="external-icon">External</Text>,
  };
});

describe("ListButton", () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render correctly with title", () => {
    const { getByText } = render(<ListButton title="Test Button" onPress={mockOnPress} />);
    expect(getByText("Test Button")).toBeTruthy();
  });

  it("should call onPress when clicked", () => {
    const { getByTestId } = render(<ListButton title="Test Button" onPress={mockOnPress} />);
    const button = getByTestId("mock-button");
    fireEvent.press(button);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it("should render an icon if provided", () => {
    const MockIcon = (props: LucidePropsWithClassName) => <Text testID="custom-icon">Icon</Text>;
    const { getByTestId } = render(
      <ListButton title="Test Button" icon={MockIcon} onPress={mockOnPress} />
    );
    expect(getByTestId("custom-icon")).toBeTruthy();
  });

  it("should render ArrowUpRightIcon if external is true", () => {
    const { getByTestId } = render(
      <ListButton title="Test Button" external={true} onPress={mockOnPress} />
    );
    expect(getByTestId("external-icon")).toBeTruthy();
  });

  it("should not render ArrowUpRightIcon if external is false or undefined", () => {
    const { queryByTestId } = render(<ListButton title="Test Button" onPress={mockOnPress} />);
    expect(queryByTestId("external-icon")).toBeNull();
  });
});
