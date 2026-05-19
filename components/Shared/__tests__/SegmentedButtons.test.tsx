import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import SegmentedButtons from "../SegmentedButtons";

jest.mock("~/hooks/animation/useButtonAnimations", () => ({
  __esModule: true,
  default: () => ({
    animatedStyle: {},
    roundedStyle: {},
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

jest.mock("~/hooks/animation/useSelectionRing", () => ({
  __esModule: true,
  default: () => ({
    onItemLayout: jest.fn(() => jest.fn()),
    ringStyle: {},
  }),
}));

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");

  const AnimatedView = React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />);

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: (Component: any) =>
        React.forwardRef((props: any, ref: any) => <Component ref={ref} {...props} />),
    },
  };
});

const mockButtons = [
  { label: "Option 1", value: "opt1", icon: <Text testID="icon-1">Icon1</Text> },
  { label: "Option 2", value: "opt2", icon: <Text testID="icon-2">Icon2</Text> },
  { label: "Option 3", value: "opt3", icon: <Text testID="icon-3">Icon3</Text> },
];

describe("SegmentedButtons", () => {
  it("should render correctly with all buttons", () => {
    const { getByText, getByTestId } = render(
      <SegmentedButtons buttons={mockButtons} value="opt1" onValueChange={jest.fn()} />
    );

    expect(getByText("Option 1")).toBeTruthy();
    expect(getByText("Option 2")).toBeTruthy();
    expect(getByText("Option 3")).toBeTruthy();

    expect(getByTestId("icon-1")).toBeTruthy();
    expect(getByTestId("icon-2")).toBeTruthy();
    expect(getByTestId("icon-3")).toBeTruthy();
  });

  it("should handle button presses correctly", () => {
    const mockOnValueChange = jest.fn();
    const { getByText } = render(
      <SegmentedButtons buttons={mockButtons} value="opt1" onValueChange={mockOnValueChange} />
    );

    fireEvent.press(getByText("Option 2"));

    expect(mockOnValueChange).toHaveBeenCalledWith("opt2");
  });

  it("should correctly indicate selected state via accessibility attributes", () => {
    const { getByLabelText } = render(
      <SegmentedButtons buttons={mockButtons} value="opt2" onValueChange={jest.fn()} />
    );

    const button1 = getByLabelText("Option 1");
    const button2 = getByLabelText("Option 2");

    expect(button1.props.accessibilityState).toEqual({ selected: false });
    expect(button2.props.accessibilityState).toEqual({ selected: true });
  });

  it("should gracefully handle columns prop", () => {
    const { getByText } = render(
      <SegmentedButtons buttons={mockButtons} value="opt1" onValueChange={jest.fn()} columns={2} />
    );

    // We expect the render to succeed. The column logic simply assigns CSS classes
    expect(getByText("Option 1")).toBeTruthy();
  });

  it("should handle missing value gracefully", () => {
    const { getByText } = render(
      <SegmentedButtons buttons={mockButtons} value={undefined} onValueChange={jest.fn()} />
    );

    expect(getByText("Option 1")).toBeTruthy();
  });
});
