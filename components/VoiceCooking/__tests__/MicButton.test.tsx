import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MicButton } from "../MicButton";
import { View } from "react-native";
import * as Haptics from "expo-haptics";

// Mock the external hooks and libraries
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("lucide-uniwind", () => ({
  MicIcon: () => <View testID="mic-icon" />,
  MicOffIcon: () => <View testID="mic-off-icon" />,
  Volume2Icon: () => <View testID="volume2-icon" />,
}));

jest.mock("~/hooks/animation/useOnPressScale", () => {
  return jest.fn(() => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }));
});

// React Native Reanimated uses a lot of native code that must be mocked out for test environments
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: {
      View: React.forwardRef((props: any, ref: any) => <View ref={ref} {...props} />),
    },
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val) => val),
    withSequence: jest.fn((...args) => args[0]),
    withRepeat: jest.fn((val) => val),
    cancelAnimation: jest.fn(),
  };
});

describe("MicButton Component", () => {
  const defaultProps = {
    isListening: false,
    onToggle: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly in default (off) state", () => {
    const { getByTestId, getByRole } = render(<MicButton {...defaultProps} />);

    expect(getByTestId("mic-off-icon")).toBeTruthy();

    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Unmute voice assistant");
  });

  it("renders correctly when listening", () => {
    const { getByTestId, getByRole } = render(<MicButton {...defaultProps} isListening={true} />);

    expect(getByTestId("mic-icon")).toBeTruthy();

    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Mute voice assistant");
  });

  it("renders correctly when speaking", () => {
    const { getByTestId } = render(<MicButton {...defaultProps} isSpeaking={true} />);

    expect(getByTestId("volume2-icon")).toBeTruthy();
  });

  it("triggers haptic feedback when pressed", () => {
    const { getByRole } = render(<MicButton {...defaultProps} />);

    fireEvent.press(getByRole("button"));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it("calls onToggle when pressed and currently disabled", () => {
    const onToggleMock = jest.fn();
    const { getByRole } = render(<MicButton {...defaultProps} onToggle={onToggleMock} />);

    fireEvent.press(getByRole("button"));

    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it("calls both onToggle and onToggleVoice when voice features are disabled and button is pressed", () => {
    const onToggleMock = jest.fn();
    const onToggleVoiceMock = jest.fn();

    const { getByRole } = render(
      <MicButton
        {...defaultProps}
        onToggle={onToggleMock}
        onToggleVoice={onToggleVoiceMock}
        voiceEnabled={false}
      />
    );

    fireEvent.press(getByRole("button"));

    expect(onToggleMock).toHaveBeenCalledTimes(1);
    expect(onToggleVoiceMock).toHaveBeenCalledTimes(1);
  });

  it("calls both onToggle and onToggleVoice when voice features are enabled and button is pressed", () => {
    const onToggleMock = jest.fn();
    const onToggleVoiceMock = jest.fn();

    const { getByRole } = render(
      <MicButton
        {...defaultProps}
        isListening={true}
        onToggle={onToggleMock}
        onToggleVoice={onToggleVoiceMock}
        voiceEnabled={true}
      />
    );

    fireEvent.press(getByRole("button"));

    expect(onToggleMock).toHaveBeenCalledTimes(1);
    expect(onToggleVoiceMock).toHaveBeenCalledTimes(1);
  });

  it("handles TTS only active (voiceEnabled=true, isListening=false)", () => {
    const onToggleMock = jest.fn();
    const onToggleVoiceMock = jest.fn();

    const { getByRole, getByTestId } = render(
      <MicButton
        {...defaultProps}
        isListening={false}
        onToggle={onToggleMock}
        onToggleVoice={onToggleVoiceMock}
        voiceEnabled={true}
      />
    );

    expect(getByTestId("mic-icon")).toBeTruthy();

    fireEvent.press(getByRole("button"));

    expect(onToggleVoiceMock).toHaveBeenCalledTimes(1);
    expect(onToggleMock).not.toHaveBeenCalled();
  });
});
