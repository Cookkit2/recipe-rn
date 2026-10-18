import { renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import useDeviceCornerRadius from "../useDeviceCornerRadius";
import useIosDeviceCornerRadius from "../useDeviceCornerRadius.ios";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 28 }) }));
jest.mock("react-native-screen-corner-radius", () => ({ ScreenCornerRadius: 54 }));

afterEach(() => jest.restoreAllMocks());

it("keeps Android's safe-area radius without relying on a native corner module", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  const { result } = await renderHook(() => useDeviceCornerRadius());
  expect(result.current).toBe(28);
});

it("keeps the iOS native radius in the iOS implementation", async () => {
  const { result } = await renderHook(() => useIosDeviceCornerRadius());
  expect(result.current).toBe(54);
});

it("uses zero on web", async () => {
  jest.replaceProperty(Platform, "OS", "web");
  const { result } = await renderHook(() => useDeviceCornerRadius());
  expect(result.current).toBe(0);
});
