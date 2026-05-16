import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import * as Haptics from "expo-haptics";

// --- Mocks ---

const mockExpand = jest.fn();
const mockClose = jest.fn();
const mockPlay = jest.fn();
const mockPause = jest.fn();

// Let React Native Reanimated jest setup happen first
// And just mock the Button component instead to avoid reanimated Animated.Image issues
jest.mock("~/components/ui/button", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return {
    Button: ({ onPress, children, testID }: any) => (
      <Pressable onPress={onPress} testID={testID || "mock-button"}>
        {children}
      </Pressable>
    ),
  };
});

import CameraOnboardingSheet from "../CameraOnboardingSheet";

// Mock dependencies
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  class BottomSheet extends React.Component {
    expand = mockExpand;
    close = mockClose;

    render() {
      // @ts-ignore
      return <View testID="bottom-sheet">{this.props.children}</View>;
    }
  }

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetView: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

jest.mock("@rn-primitives/portal", () => {
  const React = require("react");
  return {
    Portal: ({ children }: any) => <>{children}</>,
  };
});

jest.mock("expo-video", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn(() => ({
      play: mockPlay,
      pause: mockPause,
    })),
    VideoView: ({ style }: any) => <View testID="video-view" style={style} />,
  };
});

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Image: ({ style }: any) => <View testID="expo-image" style={style} />,
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 20 }),
}));

jest.mock("~/hooks/useColor", () => {
  return {
    __esModule: true,
    default: () => ({ card: "#FFFFFF" }),
  };
});

jest.mock("~/utils/logger", () => ({
  log: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock local storage state hook
let mockIsOnboardingComplete = false;
let mockIsLoading = false;
const mockSetIsOnboardingComplete = jest.fn((val: boolean) => {
  mockIsOnboardingComplete = val;
});

jest.mock("~/hooks/useLocalStorageState", () => {
  return {
    __esModule: true,
    default: jest.fn(() => [
      mockIsOnboardingComplete,
      mockSetIsOnboardingComplete,
      { isLoading: mockIsLoading },
    ]),
  };
});

// Mock PoweredByAI to avoid rendering complex nested components
jest.mock("../../Shared/PoweredByAI", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text testID="powered-by-ai">Powered By AI</Text>;
});

describe("CameraOnboardingSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnboardingComplete = false;
    mockIsLoading = false;
  });

  it("should render nothing when loading is true", () => {
    mockIsLoading = true;
    const { toJSON } = render(<CameraOnboardingSheet />);
    expect(toJSON()).toBeNull();
  });

  it("should expand sheet and play video when onboarding is incomplete", () => {
    mockIsOnboardingComplete = false;
    render(<CameraOnboardingSheet />);

    expect(mockExpand).toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalled();
  });

  it("should close sheet and pause video when onboarding is complete", () => {
    mockIsOnboardingComplete = true;
    render(<CameraOnboardingSheet />);

    expect(mockClose).toHaveBeenCalled();
    expect(mockPause).toHaveBeenCalled();
  });

  it("should mark onboarding complete, trigger haptics, pause video, and close sheet when 'Got It' button is pressed", async () => {
    mockIsOnboardingComplete = false;
    const { getByText } = render(<CameraOnboardingSheet />);

    const gotItButton = getByText("Got It");
    fireEvent.press(gotItButton);

    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
    expect(mockPause).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    expect(mockSetIsOnboardingComplete).toHaveBeenCalledWith(true);
  });
});
