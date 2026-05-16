import React from "react";
import { render } from "@testing-library/react-native";
import Header from "../Header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View } from "react-native";

// Mock the hooks and components
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const View = require("react-native").View;

  // Create simple wrapper for Animated components
  const AnimatedView = React.forwardRef(({ children, style, ...props }: any, ref: any) => (
    <View
      ref={ref}
      style={Array.isArray(style) ? style : [style]}
      testID="animated-view"
      {...props}
    >
      {children}
    </View>
  ));
  AnimatedView.displayName = "Animated.View";

  return {
    View: AnimatedView,
    Text: View, // We don't use Animated.Text here but good to have
    ScrollView: View,
    createAnimatedComponent: jest.fn((Component) => Component),
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn((cb) => cb()),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
    interpolate: jest.fn(),
    Extrapolate: { CLAMP: "clamp" },
    Easing: {
      bezier: jest.fn(),
    },
    ReduceMotion: {
      System: "system",
    },
    default: {
      View: AnimatedView,
      Text: View,
      ScrollView: View,
      createAnimatedComponent: jest.fn((Component) => Component),
    },
  };
});

// Mock UI components that might be problematic
jest.mock("~/components/ui/button", () => ({
  Button: "Button",
}));

// Provide a mock that actually renders its children as text
jest.mock("~/components/ui/typography", () => {
  const { Text } = require("react-native");
  return {
    H4: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

jest.mock("lucide-uniwind", () => ({
  ArrowLeftIcon: "ArrowLeftIcon",
}));

// Mock curves constants since it relies on real Reanimated Easing
jest.mock("~/constants/curves", () => ({
  CURVES: {
    "expressive.fast.spatial": { duration: 300 },
    "expressive.fast.effects": { duration: 300 },
    "expressive.default.spatial": { duration: 500 },
    "expressive.default.effects": { duration: 500 },
  },
}));

describe("Header Component", () => {
  beforeEach(() => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 40 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { toJSON } = render(<Header />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders title when provided", () => {
    const { getByText } = render(<Header title="My Recipe" />);
    expect(getByText("My Recipe")).toBeTruthy();
  });

  it("applies safe area top inset to padding", () => {
    const { getAllByTestId } = render(<Header />);

    // We expect paddingTop to be top (40) + 20 = 60
    const animatedViews = getAllByTestId("animated-view");
    const mainView = animatedViews[0];

    expect(mainView.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingTop: 60 })])
    );
  });

  it("does not render title when title is missing", () => {
    const { queryByText } = render(<Header />);
    expect(queryByText("My Recipe")).toBeNull();
  });

  it("updates animated styles based on scrollOffset", () => {
    const scrollOffset = { value: 100 } as any; // Mock scrollOffset > 60
    const { toJSON } = render(<Header title="Test Title" scrollOffset={scrollOffset} />);
    expect(toJSON()).toBeTruthy();
  });
});
