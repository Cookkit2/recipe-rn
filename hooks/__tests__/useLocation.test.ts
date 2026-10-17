import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import { useLocation } from "../useLocation";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const permissions = jest.mocked(Location.getForegroundPermissionsAsync);
const position = jest.mocked(Location.getCurrentPositionAsync);

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  permissions.mockResolvedValue({
    status: Location.PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: true,
    expires: "never",
  });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it("preserves granted permission when location acquisition fails", async () => {
  position.mockRejectedValue(new Error("GPS unavailable"));
  const { result } = await renderHook(() => useLocation());
  expect(result.current).toEqual({
    location: null,
    error: "GPS unavailable",
    loading: false,
    permissionGranted: true,
  });
});

it("preserves granted permission when location acquisition times out", async () => {
  position.mockReturnValue(new Promise(() => {}));
  const { result } = await renderHook(() => useLocation());
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10000);
  });
  expect(result.current).toEqual({
    location: null,
    error: "Location timeout",
    loading: false,
    permissionGranted: true,
  });
});

it("reports denied permission without requesting a position", async () => {
  permissions.mockResolvedValue({
    status: Location.PermissionStatus.DENIED,
    granted: false,
    canAskAgain: true,
    expires: "never",
  });
  const { result } = await renderHook(() => useLocation());
  expect(result.current.permissionGranted).toBe(false);
  expect(result.current.error).toBe("Location permission denied");
  expect(position).not.toHaveBeenCalled();
});
