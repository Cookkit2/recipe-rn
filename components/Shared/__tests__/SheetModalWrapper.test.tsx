import React from "react";
import { render } from "@testing-library/react-native";
import { View, Text } from "react-native";
import SheetModalWrapper from "../SheetModalWrapper";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: "Medium" },
}));

jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (fn: Function) => fn(),
}));

jest.mock("~/utils/logger", () => ({
  log: {
    warn: jest.fn(),
  },
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, ScrollView } = require("react-native");

  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: any) =>
        React.createElement(View, { style, ...props }, children),
      ScrollView: ({ children, style, ...props }: any) =>
        React.createElement(ScrollView, { style, ...props }, children),
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: () => () => {},
    useAnimatedReaction: () => {},
    withTiming: (val: any) => val,
    withSpring: (val: any) => val,
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");

  const Gesture = {
    Pan: () => ({
      onStart: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
      onFinalize: jest.fn().mockReturnThis(),
    }),
    Native: () => ({
      onBegin: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
    Simultaneous: jest.fn(),
  };

  const GestureDetector = ({ children }: any) => {
    return React.createElement(View, { testID: "gesture-detector" }, children);
  };

  return {
    Gesture,
    GestureDetector,
  };
});

describe("SheetModalWrapper", () => {
  it("renders children correctly", () => {
    const { getByTestId, getByText } = render(
      <SheetModalWrapper>
        {({ ScrollComponent, scrollRef }) => (
          <ScrollComponent testID="mock-scroll-view">
            <Text>Modal Content</Text>
          </ScrollComponent>
        )}
      </SheetModalWrapper>
    );

    expect(getByTestId("mock-scroll-view")).toBeTruthy();
    expect(getByText("Modal Content")).toBeTruthy();
  });
});
