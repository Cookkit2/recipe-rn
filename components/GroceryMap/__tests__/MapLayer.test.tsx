// components/GroceryMap/__tests__/MapLayer.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MapLayer } from "../MapLayer";

describe("MapLayer", () => {
  it("renders map with markers", () => {
    const mockStores = [
      {
        id: "1",
        name: "Store A",
        latitude: 3.1577,
        longitude: 101.7122,
        totalPriceCents: 1500,
        distance: 1.2,
      },
      {
        id: "2",
        name: "Store B",
        latitude: 3.158,
        longitude: 101.713,
        totalPriceCents: 1200,
        distance: 0.8,
      },
    ];

    const { getByTestId } = render(
      <MapLayer
        stores={mockStores}
        userLocation={{ latitude: 3.1577, longitude: 101.7122 }}
        onMarkerPress={jest.fn()}
      />
    );

    // Expo Maps component should render
    expect(getByTestId("MapView")).toBeTruthy();
  });

  it("calls onMarkerPress when marker tapped", () => {
    const mockOnPress = jest.fn();
    const mockStores = [
      {
        id: "1",
        name: "Store A",
        latitude: 3.1577,
        longitude: 101.7122,
        totalPriceCents: 1500,
        distance: 1.2,
      },
    ];

    const { getByTestId } = render(
      <MapLayer
        stores={mockStores}
        userLocation={{ latitude: 3.1577, longitude: 101.7122 }}
        onMarkerPress={mockOnPress}
      />
    );

    const mapView = getByTestId("MapView");
    expect(mapView).toBeTruthy();

    // Simulate marker click event
    // The GoogleMaps.View mock spreads props, so onMarkerClick is available
    fireEvent(mapView, "markerClick", { id: "1" });

    expect(mockOnPress).toHaveBeenCalledWith("1");
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
