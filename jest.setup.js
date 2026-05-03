// Jest setup file for React Native

// Mock native modules that might not be available in test environment
global.__ADEXPERIMENTAL__ = true;
global.__DEV__ = true;

// Jest resolves `Platform.js` incorrectly vs Metro (self-import shim); Pressable needs a real `OS`.
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  __esModule: true,
  default: {
    OS: "ios",
    Version: 17,
    constants: {
      systemVersion: "17.0",
      reactNativeVersion: { major: 0, minor: 83, patch: 0 },
    },
    select: (spec) => spec.ios ?? spec.native ?? spec.default,
    isPad: false,
    isTVOS: false,
    isTesting: true,
  },
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  // Lazy-require RN so jest/react-native setup finishes before native shims load.
  let cachedRn;
  const getRn = () => {
    if (!cachedRn) {
      cachedRn = require("react-native");
    }
    return cachedRn;
  };

  function AnimatedView(props) {
    return React.createElement(getRn().View, props);
  }

  const useSharedValue = (init) => ({ value: init });
  const useAnimatedStyle = (fn) => {
    try {
      return typeof fn === "function" ? fn() : {};
    } catch {
      return {};
    }
  };
  const withTiming = (toValue) => toValue;
  const withSequence = (...steps) => steps[steps.length - 1];

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: (comp) => comp,
    },
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    useDerivedValue: (fn) => ({ value: typeof fn === "function" ? fn() : fn }),
    runOnJS: (fn) => fn,
    Easing: { linear: (t) => t },
  };
});

// Mock ActivityIndicator for testing
jest.mock(
  "react-native/Libraries/Components/ActivityIndicator/ActivityIndicator",
  () => "ActivityIndicator"
);
