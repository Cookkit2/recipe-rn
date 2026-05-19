// Jest setup file for React Native

// Mock native modules that might not be available in test environment
global.__ADEXPERIMENTAL__ = true;
global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

// Provide minimal native module stubs so `require('react-native')` works in test mocks
// without the old react-native/jest/setup.js (removed in RN 0.85)
jest.mock("react-native/Libraries/BatchedBridge/NativeModules", () => {
  const handler = {
    get: (_, name) =>
      new Proxy(
        {},
        {
          get: (_, method) => {
            if (method === "getConstants") return () => ({});
            return () => {};
          },
        }
      ),
  };
  return { __esModule: true, default: new Proxy({}, handler) };
});

jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => ({
  __esModule: true,
  getEnforcing: (name) => {
    const stub = new Proxy(
      {},
      {
        get: (_, method) => {
          if (method === "getConstants") return () => ({});
          if (method === "addListener") return () => {};
          if (method === "removeListeners") return () => {};
          return () => {};
        },
      }
    );
    // Special-case modules that return specific constants
    if (name === "SourceCode") return { getConstants: () => ({ scriptURL: "" }) };
    if (name === "PlatformConstants")
      return { getConstants: () => ({ forceTouchAvailable: false, interfaceIdiom: "phone" }) };
    if (name === "DeviceInfo")
      return {
        getConstants: () => ({
          Dimensions: {
            window: { width: 375, height: 812, scale: 3 },
            screen: { width: 375, height: 812, scale: 3 },
          },
        }),
      };
    return stub;
  },
  get: () => null,
}));

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
