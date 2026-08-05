import { renderHook, act } from "@testing-library/react-hooks";
import { useLocation } from "../useLocation";
import * as Location from "expo-location";

jest.mock("expo-location");
const mockedLocation = Location as jest.Mocked<typeof Location>;

const waitForLoadingToFinish = async (result: any) => {
  for (let i = 0; i < 50; i++) {
    if (result.current.loading === false) break;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
};

describe("useLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("handles permission denied", async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: "denied" as any,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });

    const { result } = renderHook(() => useLocation());
    expect(result.current.loading).toBe(true);

    await waitForLoadingToFinish(result);

    expect(result.current.permissionGranted).toBe(false);
    expect(result.current.error).toBe("Location permission denied");
    expect(result.current.loading).toBe(false);
    expect(result.current.location).toBeNull();
  });

  it("returns location data on success", async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });

    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 10,
        longitude: 20,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useLocation());

    await waitForLoadingToFinish(result);

    expect(result.current.permissionGranted).toBe(true);
    expect(result.current.location).toEqual({ latitude: 10, longitude: 20 });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles location timeout", async () => {
    jest.useFakeTimers();

    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });

    // Make getCurrentPositionAsync never resolve
    mockedLocation.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useLocation());

    // Flush promises to resolve permissions
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // We must ensure the `permissionGranted` state was updated to true before throwing the error.
    // React state updates happen in the next tick, so we might need more flushes.
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // Advance timers by timeout duration (10000ms)
    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    // Wait until loading finishes
    for (let i = 0; i < 10; i++) {
      if (result.current.loading === false) break;
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(result.current.error).toBe("Location timeout");
    expect(result.current.loading).toBe(false);
    expect(result.current.location).toBeNull();
    // The bug is that `state.permissionGranted` is stale in the `catch` block. Let's fix the bug AND test it!
  });

  it("handles get position errors", async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });

    mockedLocation.getCurrentPositionAsync.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useLocation());

    await waitForLoadingToFinish(result);

    expect(result.current.error).toBe("Network error");
    expect(result.current.loading).toBe(false);
    expect(result.current.location).toBeNull();
  });

  it("refreshes location on interval", async () => {
    jest.useFakeTimers();

    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: "granted" as any,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });

    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 10,
        longitude: 20,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    const { result, unmount } = renderHook(() => useLocation(5000));

    // Allow first fetch to complete
    for (let i = 0; i < 10; i++) {
      if (result.current.loading === false) break;
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);

    // Trigger the interval
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    for (let i = 0; i < 10; i++) {
      // wait for second run to finish
      if (
        result.current.loading === false &&
        mockedLocation.getForegroundPermissionsAsync.mock.calls.length === 2
      )
        break;
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);

    unmount();
  });
});
