import { renderHook, act, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import { useLocation, useLocationOnce } from "../useLocation";

// Mock expo-location
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 2,
  },
}));

describe("useLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with loading state and then handle permission denied", async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });

    const { result } = renderHook(() => useLocation());

    // Initial state
    expect(result.current).toEqual({
      location: null,
      error: null,
      loading: true,
      permissionGranted: false,
    });

    // Wait for the async effect to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toEqual({
      location: null,
      error: "Location permission denied",
      loading: false,
      permissionGranted: false,
    });
  });

  it("should successfully get location when permission is granted", async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 37.7749, longitude: -122.4194 },
    });

    const { result } = renderHook(() => useLocation());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toEqual({
      location: { latitude: 37.7749, longitude: -122.4194 },
      error: null,
      loading: false,
      permissionGranted: true,
    });
  });

  it("should handle location timeout", async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });

    // Mock getCurrentPositionAsync to never resolve
    (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useLocation());

    expect(result.current.loading).toBe(true);

    // Fast-forward time to trigger timeout
    await waitFor(() => {
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual({
      location: null,
      error: "Location timeout",
      loading: false,
      permissionGranted: true,
    });
  });

  it("should refresh location on interval", async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Location.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ coords: { latitude: 10, longitude: 20 } })
      .mockResolvedValueOnce({ coords: { latitude: 30, longitude: 40 } });

    const { result } = renderHook(() => useLocation(5000));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.location).toEqual({ latitude: 10, longitude: 20 });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.location).toEqual({ latitude: 30, longitude: 40 });
    });
  });

  it("should handle getCurrentPositionAsync error", async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error("GPS signal lost"));

    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toEqual({
      location: null,
      error: "GPS signal lost",
      loading: false,
      permissionGranted: true,
    });
  });
});

describe("useLocationOnce", () => {
  it("should call useLocation with null refreshInterval", async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 0, longitude: 0 },
    });

    const { result } = renderHook(() => useLocationOnce());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.location).toEqual({ latitude: 0, longitude: 0 });
  });
});
