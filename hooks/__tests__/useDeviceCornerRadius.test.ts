import { renderHook } from "@testing-library/react-hooks";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenCornerRadius } from "react-native-screen-corner-radius";
import useDeviceCornerRadius from "../useDeviceCornerRadius";

// Mock the dependencies
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock("react-native-screen-corner-radius", () => ({
  ScreenCornerRadius: 40,
}));

describe("useDeviceCornerRadius", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return safe area inset top for android", () => {
    Platform.OS = "android";
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 24, bottom: 0, left: 0, right: 0 });

    const { result } = renderHook(() => useDeviceCornerRadius());

    expect(result.current).toBe(24);
  });

  it("should return ScreenCornerRadius for ios", () => {
    Platform.OS = "ios";
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 44, bottom: 0, left: 0, right: 0 });

    const { result } = renderHook(() => useDeviceCornerRadius());

    expect(result.current).toBe(40);
  });

  it("should return 0 for ios if ScreenCornerRadius is not available", () => {
    Platform.OS = "ios";
    // Need to reset the module mock to test undefined ScreenCornerRadius
    jest.resetModules();
    jest.doMock("react-native-screen-corner-radius", () => ({
      ScreenCornerRadius: undefined,
    }));

    // We need to require the module again after doMock
    const useDeviceCornerRadiusWithNewMock = require("../useDeviceCornerRadius").default;

    const { result } = renderHook(() => useDeviceCornerRadiusWithNewMock());

    expect(result.current).toBe(0);
  });

  it("should return 0 for other platforms", () => {
    Platform.OS = "web";
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });

    const { result } = renderHook(() => useDeviceCornerRadius());

    expect(result.current).toBe(0);
  });
});
