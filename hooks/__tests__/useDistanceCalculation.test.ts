import { renderHook } from "@testing-library/react-hooks";
import { useDistanceCalculation } from "../useDistanceCalculation";
import { haversineDistance } from "~/utils/distance-calculation";

jest.mock("~/utils/distance-calculation", () => ({
  haversineDistance: jest.fn((lat1, lon1, lat2, lon2) => {
    // Simplified Manhattan distance for deterministic testing of sorting
    return Math.abs(lat1 - lat2) + Math.abs(lon1 - lon2);
  }),
}));

describe("useDistanceCalculation", () => {
  const stores = [
    {
      id: "1",
      name: "Store 1",
      address: "123 Main St",
      latitude: 10,
      longitude: 10,
    },
    {
      id: "2",
      name: "Store 2",
      address: "456 Main St",
      latitude: 20,
      longitude: 20,
    },
    {
      id: "3",
      name: "Store 3",
      address: "789 Main St",
      latitude: null,
      longitude: null,
    },
    {
      id: "4",
      name: "Store 4",
      address: "999 Main St",
      latitude: 15,
      longitude: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns infinity distance for all stores when userLocation is null", () => {
    const { result } = renderHook(() => useDistanceCalculation(null, stores));

    expect(result.current).toHaveLength(4);
    result.current.forEach((store) => {
      expect(store.distance).toBe(Infinity);
    });
  });

  it("calculates and sorts stores by distance when user location is provided", () => {
    const userLocation = { latitude: 19, longitude: 19 };

    const { result } = renderHook(() => useDistanceCalculation(userLocation, stores));

    expect(result.current).toHaveLength(4);

    // Store 2 is at (20,20) -> distance: 2
    expect(result.current[0]!.id).toBe("2");

    // Store 1 is at (10,10) -> distance: 18
    expect(result.current[1]!.id).toBe("1");

    // Stores 3 and 4 lack one or more coordinates
    expect(result.current[2]!.distance).toBe(Infinity);
    expect(result.current[3]!.distance).toBe(Infinity);

    expect(result.current[0]!.distance).toBeLessThan(result.current[1]!.distance);

    expect(haversineDistance).toHaveBeenCalled();
  });

  it("recalculates when userLocation changes", () => {
    const { result, rerender } = renderHook(
      ({ location, storeList }) => useDistanceCalculation(location, storeList),
      { initialProps: { location: { latitude: 11, longitude: 11 }, storeList: stores } }
    );

    // Nearest to (11,11) is Store 1 (10,10)
    expect(result.current[0]!.id).toBe("1");
    expect(result.current[1]!.id).toBe("2");

    // Change location to be near Store 2 (20,20)
    rerender({ location: { latitude: 21, longitude: 21 }, storeList: stores });

    // Now Store 2 should be closest
    expect(result.current[0]!.id).toBe("2");
    expect(result.current[1]!.id).toBe("1");
  });

  it("handles empty store list", () => {
    const { result } = renderHook(() =>
      useDistanceCalculation({ latitude: 10, longitude: 10 }, [])
    );
    expect(result.current).toHaveLength(0);
  });
});
