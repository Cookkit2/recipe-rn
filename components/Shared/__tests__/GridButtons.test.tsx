import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";
import GridButtons from "~/components/Shared/GridButtons";

// Mock dependencies
jest.mock("~/hooks/animation/useButtonAnimations", () => ({
  __esModule: true,
  default: () => ({
    animatedStyle: {},
    roundedStyle: {},
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

describe("GridButtons", () => {
  const mockButtons = [
    { label: "Button 1", icon: <View testID="icon-1" />, value: "val1" },
    { label: "Button 2", icon: <View testID="icon-2" />, value: "val2" },
    { label: "Button 3", icon: <View testID="icon-3" />, value: "val3" },
  ];

  it("should render correctly with all buttons", () => {
    const { getByText, getByTestId } = render(
      <GridButtons buttons={mockButtons} value={[]} onValueChange={jest.fn()} />
    );

    expect(getByText("Button 1")).toBeTruthy();
    expect(getByText("Button 2")).toBeTruthy();
    expect(getByText("Button 3")).toBeTruthy();

    expect(getByTestId("icon-1")).toBeTruthy();
    expect(getByTestId("icon-2")).toBeTruthy();
    expect(getByTestId("icon-3")).toBeTruthy();
  });

  it("should call onValueChange when a button is pressed", () => {
    const mockOnValueChange = jest.fn();
    const { getByText } = render(
      <GridButtons buttons={mockButtons} value={[]} onValueChange={mockOnValueChange} />
    );

    fireEvent.press(getByText("Button 1"));
    expect(mockOnValueChange).toHaveBeenCalledWith("val1");

    fireEvent.press(getByText("Button 2"));
    expect(mockOnValueChange).toHaveBeenCalledWith("val2");
  });

  it("should indicate selection state correctly based on accessibilityState", () => {
    const { getByLabelText } = render(
      <GridButtons buttons={mockButtons} value={["val2"]} onValueChange={jest.fn()} />
    );

    const button1 = getByLabelText("Button 1");
    const button2 = getByLabelText("Button 2");

    expect(button2.props.accessibilityState).toMatchObject({ selected: true });
    expect(button1.props.accessibilityState).toMatchObject({ selected: false });
  });

  it("should render selected state for multiple values", () => {
    const { getByLabelText } = render(
      <GridButtons buttons={mockButtons} value={["val1", "val3"]} onValueChange={jest.fn()} />
    );

    const button1 = getByLabelText("Button 1");
    const button2 = getByLabelText("Button 2");
    const button3 = getByLabelText("Button 3");

    expect(button1.props.accessibilityState).toMatchObject({ selected: true });
    expect(button2.props.accessibilityState).toMatchObject({ selected: false });
    expect(button3.props.accessibilityState).toMatchObject({ selected: true });
  });
});
