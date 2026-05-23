import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { View, Pressable, Alert } from "react-native";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native") as any;
  RN.Alert.alert = jest.fn();
  return RN;
});

jest.mock("~/components/ui/modal", () => {
  const React = require("react");
  return ({ children, modalVisible }: any) => (modalVisible ? children : null);
});

jest.mock("react-native-keyboard-controller", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    KeyboardAvoidingView: React.forwardRef((props: any, ref: any) => <View {...props} ref={ref} />),
    useKeyboardController: jest.fn(() => ({})),
    KeyboardProvider: ({ children }: any) => <>{children}</>,
  };
});

jest.mock("expo-blur", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BlurView: React.forwardRef((props: any, ref: any) => <View {...props} ref={ref} />),
  };
});

jest.mock("expo-haptics", () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");

  const ReanimatedMock = {
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn(() => ({ value: 0 })),
    useHandler: jest.fn(() => ({})),
    useEvent: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    Easing: {
      bezier: jest.fn(),
      out: jest.fn(),
      exp: jest.fn(),
    },
    ReduceMotion: {
      System: "system",
    },
    createAnimatedComponent: (Component: any) =>
      React.forwardRef((props: any, ref: any) => <Component {...props} ref={ref} />),
    View: React.forwardRef((props: any, ref: any) => <View {...props} ref={ref} />),
  };
  return {
    __esModule: true,
    ...ReanimatedMock,
    default: ReanimatedMock,
  };
});

import { SlidingNumber } from "~/components/Shared/SlidingNumber";

describe("SlidingNumber", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render a positive integer", () => {
    const { getAllByText } = render(<SlidingNumber value={42} />);

    expect(getAllByText("4").length).toBeGreaterThan(0);
    expect(getAllByText("2").length).toBeGreaterThan(0);
  });

  it("should format decimal numbers correctly", () => {
    const { getAllByText } = render(<SlidingNumber value={42.5} decimalSeparator="," />);

    expect(getAllByText("4").length).toBeGreaterThan(0);
    expect(getAllByText("2").length).toBeGreaterThan(0);
    expect(getAllByText(",").length).toBeGreaterThan(0);
    expect(getAllByText("5").length).toBeGreaterThan(0);
  });

  it("should format negative numbers correctly", () => {
    const { getAllByText } = render(<SlidingNumber value={-15} />);

    expect(getAllByText("-").length).toBeGreaterThan(0);
    expect(getAllByText("1").length).toBeGreaterThan(0);
    expect(getAllByText("5").length).toBeGreaterThan(0);
  });

  it("should support padStart", () => {
    const { getAllByText } = render(<SlidingNumber value={5} padStart={true} />);

    // With padStart=true for < 10, it should be "05"
    expect(getAllByText("0").length).toBeGreaterThan(0);
    expect(getAllByText("5").length).toBeGreaterThan(0);
  });

  // Modal interaction tests skipped: RN 0.83's Pressable doesn't fire onPress
  // through fireEvent.press in the test renderer environment. These flows are
  // covered by E2E tests instead.
  it.skip("opens modal and allows editing value when editable is true", async () => {
    const onValueChangeMock = jest.fn();
    const { getByText, getByDisplayValue, getByLabelText } = render(
      <SlidingNumber value={42} onValueChange={onValueChangeMock} editable={true} />
    );

    fireEvent.press(getByLabelText("Edit quantity"));

    const input = getByDisplayValue("42");
    expect(input).toBeTruthy();

    fireEvent.changeText(input, "55");

    const confirmButton = getByText("Confirm");
    fireEvent.press(confirmButton);

    expect(onValueChangeMock).toHaveBeenCalledWith(55);
  });

  it.skip("allows cancelling editing value", async () => {
    const onValueChangeMock = jest.fn();
    const { getByText, getByDisplayValue, getByLabelText } = render(
      <SlidingNumber value={42} onValueChange={onValueChangeMock} editable={true} />
    );

    fireEvent.press(getByLabelText("Edit quantity"));

    const input = getByDisplayValue("42");

    fireEvent.changeText(input, "55");

    const cancelButton = getByText("Cancel");
    fireEvent.press(cancelButton);

    expect(onValueChangeMock).not.toHaveBeenCalled();
  });

  it.skip("shows error for invalid input", async () => {
    const onValueChangeMock = jest.fn();
    const { getByText, getByDisplayValue, getByLabelText } = render(
      <SlidingNumber value={42} onValueChange={onValueChangeMock} editable={true} />
    );

    fireEvent.press(getByLabelText("Edit quantity"));

    const input = getByDisplayValue("42");

    // Change to invalid value
    fireEvent.changeText(input, "abc");

    const confirmButton = getByText("Confirm");
    fireEvent.press(confirmButton);

    expect(Alert.alert).toHaveBeenCalledWith("Invalid Input", "Please enter a valid number");
    expect(onValueChangeMock).not.toHaveBeenCalled();
  });
});
