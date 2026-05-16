import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MicButton } from "../MicButton";
import * as Haptics from "expo-haptics";
import { View } from "react-native";

// Mock dependencies
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light" },
}));

jest.mock("lucide-uniwind", () => ({
  MicIcon: () => <View testID="mic-icon" />,
  MicOffIcon: () => <View testID="mic-off-icon" />,
  Volume2Icon: () => <View testID="volume2-icon" />,
}));

jest.mock("~/hooks/animation/useOnPressScale", () => {
  return jest.fn().mockReturnValue({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  });
});

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const View = require("react-native").View;
  return {
    __esModule: true,
    default: {
      View: View,
    },
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withRepeat: jest.fn(),
    withSequence: jest.fn(),
    withTiming: jest.fn(),
    cancelAnimation: jest.fn(),
  };
});

jest.mock("~/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("MicButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders default off state", () => {
    const onToggle = jest.fn();
    const { getByTestId, getByRole } = render(
      <MicButton isListening={false} onToggle={onToggle} />
    );

    expect(getByTestId("mic-off-icon")).toBeTruthy();
    expect(getByRole("button")).toHaveProp("accessibilityLabel", "Unmute voice assistant");
  });

  it("renders listening state", () => {
    const onToggle = jest.fn();
    const { getByTestId, getByRole } = render(<MicButton isListening={true} onToggle={onToggle} />);

    expect(getByTestId("mic-icon")).toBeTruthy();
    expect(getByRole("button")).toHaveProp("accessibilityLabel", "Mute voice assistant");
  });

  it("renders speaking state", () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <MicButton isListening={false} isSpeaking={true} onToggle={onToggle} />
    );

    expect(getByTestId("volume2-icon")).toBeTruthy();
  });

  it("renders enabled state when voiceEnabled is true", () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <MicButton isListening={false} voiceEnabled={true} onToggle={onToggle} />
    );

    expect(getByTestId("mic-icon")).toBeTruthy();
  });

  it("calls onToggle and haptics on press", () => {
    const onToggle = jest.fn();
    const { getByRole } = render(<MicButton isListening={false} onToggle={onToggle} />);

    fireEvent.press(getByRole("button"));

    expect(Haptics.impactAsync).toHaveBeenCalledWith("Light");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleVoice when voice is enabled and pressed", () => {
    const onToggle = jest.fn();
    const onToggleVoice = jest.fn();
    const { getByRole } = render(
      <MicButton
        isListening={false}
        voiceEnabled={true}
        onToggle={onToggle}
        onToggleVoice={onToggleVoice}
      />
    );

    fireEvent.press(getByRole("button"));

    expect(onToggleVoice).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled(); // isListening is false, so it doesn't call onToggle to stop listening
  });

  it("calls both onToggle and onToggleVoice when both are active and pressed", () => {
    const onToggle = jest.fn();
    const onToggleVoice = jest.fn();
    const { getByRole } = render(
      <MicButton
        isListening={true}
        voiceEnabled={true}
        onToggle={onToggle}
        onToggleVoice={onToggleVoice}
      />
    );

    fireEvent.press(getByRole("button"));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggleVoice).toHaveBeenCalledTimes(1);
  });

  it("calls both onToggle and onToggleVoice when both are inactive and pressed", () => {
    const onToggle = jest.fn();
    const onToggleVoice = jest.fn();
    const { getByRole } = render(
      <MicButton
        isListening={false}
        voiceEnabled={false}
        onToggle={onToggle}
        onToggleVoice={onToggleVoice}
      />
    );

    fireEvent.press(getByRole("button"));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggleVoice).toHaveBeenCalledTimes(1);
  });
});
