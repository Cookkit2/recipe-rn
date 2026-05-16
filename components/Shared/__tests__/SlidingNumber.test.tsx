/**
 * Test suite for SlidingNumber component
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { SlidingNumber } from "../SlidingNumber";
import { Alert } from "react-native";

// Mock dependencies
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");

  const ReanimatedView = React.forwardRef((props: any, ref: any) => {
    return <View ref={ref} {...props} />;
  });

  return {
    __esModule: true,
    default: {
      View: ReanimatedView,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (cb: any) => cb(),
    withTiming: (toValue: any) => toValue,
    View: ReanimatedView,
    Easing: {
      bezier: jest.fn(),
    },
    ReduceMotion: {
      System: "System",
    },
  };
});

// Mock hooks
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({
    background: "#FFFFFF",
    foreground: "#000000",
  }),
}));

jest.mock("~/components/ui/typography", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    H4: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    P: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

jest.mock("~/components/ui/button", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    Button: ({ children, onPress, ...props }: any) => (
      <Pressable onPress={onPress} {...props}>
        {children}
      </Pressable>
    ),
  };
});

jest.mock("~/components/ui/input", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return {
    Input: (props: any) => <TextInput {...props} />,
  };
});

jest.mock("~/components/ui/modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, modalVisible }: any) => {
      if (!modalVisible) return null;
      return <View testID="mock-modal">{children}</View>;
    },
  };
});

jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("SlidingNumber", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render correctly with positive integer", () => {
    const { getAllByText } = render(<SlidingNumber value={123} editable={false} />);
    expect(getAllByText("1").length).toBeGreaterThan(0);
    expect(getAllByText("2").length).toBeGreaterThan(0);
    expect(getAllByText("3").length).toBeGreaterThan(0);
  });

  it("should render correctly with negative integer", () => {
    const { getByText, getAllByText } = render(<SlidingNumber value={-45} editable={false} />);
    expect(getByText("-")).toBeTruthy();
    expect(getAllByText("4").length).toBeGreaterThan(0);
    expect(getAllByText("5").length).toBeGreaterThan(0);
  });

  it("should render correctly with decimal number", () => {
    const { getByText, getAllByText } = render(<SlidingNumber value={67.89} editable={false} />);
    expect(getAllByText("6").length).toBeGreaterThan(0);
    expect(getAllByText("7").length).toBeGreaterThan(0);
    expect(getByText(".")).toBeTruthy();
    expect(getAllByText("8").length).toBeGreaterThan(0);
    expect(getAllByText("9").length).toBeGreaterThan(0);
  });

  it("should use custom decimal separator", () => {
    const { getByText } = render(
      <SlidingNumber value={67.89} decimalSeparator="," editable={false} />
    );
    expect(getByText(",")).toBeTruthy();
  });

  it("should pad start with zero when padStart is true and value < 10", () => {
    const { getAllByText } = render(<SlidingNumber value={5} padStart={true} editable={false} />);
    expect(getAllByText("0").length).toBeGreaterThan(0);
    expect(getAllByText("5").length).toBeGreaterThan(0);
  });

  it("should open modal when pressed if editable", () => {
    const onValueChange = jest.fn();
    const { getByText, getByDisplayValue, getAllByText } = render(
      <SlidingNumber value={42} onValueChange={onValueChange} editable={true} />
    );

    const pressableArea = getAllByText("4")[0];
    fireEvent.press(pressableArea);

    expect(getByText("Enter Quantity")).toBeTruthy();
    expect(getByDisplayValue("42")).toBeTruthy();
  });

  it("should not open modal when pressed if not editable", () => {
    const onValueChange = jest.fn();
    const { queryByText, getAllByText } = render(
      <SlidingNumber value={42} onValueChange={onValueChange} editable={false} />
    );

    const pressableArea = getAllByText("4")[0];
    fireEvent.press(pressableArea);

    expect(queryByText("Enter Quantity")).toBeNull();
  });

  it("should submit new value correctly", () => {
    const onValueChange = jest.fn();
    const { getByText, getByDisplayValue, getAllByText } = render(
      <SlidingNumber value={42} onValueChange={onValueChange} editable={true} />
    );

    fireEvent.press(getAllByText("4")[0]);

    const input = getByDisplayValue("42");
    fireEvent.changeText(input, "100");

    fireEvent.press(getByText("Confirm"));

    expect(onValueChange).toHaveBeenCalledWith(100);
  });

  it("should alert on invalid input", () => {
    const onValueChange = jest.fn();
    const { getByText, getByDisplayValue, getAllByText } = render(
      <SlidingNumber value={42} onValueChange={onValueChange} editable={true} />
    );

    fireEvent.press(getAllByText("4")[0]);

    const input = getByDisplayValue("42");
    fireEvent.changeText(input, "abc");

    fireEvent.press(getByText("Confirm"));

    expect(Alert.alert).toHaveBeenCalledWith("Invalid Input", "Please enter a valid number");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("should clamp value to 9999 on submit", () => {
    const onValueChange = jest.fn();
    const { getByText, getByDisplayValue, getAllByText } = render(
      <SlidingNumber value={42} onValueChange={onValueChange} editable={true} />
    );

    fireEvent.press(getAllByText("4")[0]);

    const input = getByDisplayValue("42");
    fireEvent.changeText(input, "10000");

    fireEvent.press(getByText("Confirm"));

    expect(onValueChange).toHaveBeenCalledWith(9999);
  });

  it("should reset input and close modal on cancel", () => {
    const onValueChange = jest.fn();
    const { getByText, getByDisplayValue, getAllByText } = render(
      <SlidingNumber value={42} onValueChange={onValueChange} editable={true} />
    );

    fireEvent.press(getAllByText("4")[0]);

    const input = getByDisplayValue("42");
    fireEvent.changeText(input, "100");

    fireEvent.press(getByText("Cancel"));

    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.press(getAllByText("4")[0]);
    expect(getByDisplayValue("42")).toBeTruthy();
  });
});
