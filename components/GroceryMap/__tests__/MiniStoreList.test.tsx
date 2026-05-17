import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MiniStoreList } from "../MiniStoreList";

describe("MiniStoreList", () => {
  it("renders 3 nearest stores", () => {
    const mockStores = [
      { id: "1", name: "Store A", address: "123 Main St", distance: 0.5, totalPriceCents: 1200 },
      { id: "2", name: "Store B", address: "456 Oak Ave", distance: 1.2, totalPriceCents: 1500 },
      { id: "3", name: "Store C", address: "789 Pine Rd", distance: 2.0, totalPriceCents: 1000 },
    ];

    const { getByText } = render(<MiniStoreList stores={mockStores} onStorePress={jest.fn()} />);

    expect(getByText("Store A")).toBeTruthy();
    expect(getByText("Store B")).toBeTruthy();
    expect(getByText("Store C")).toBeTruthy();
  });

  it("calls onStorePress when card tapped", () => {
    const mockOnPress = jest.fn();
    const mockStores = [
      { id: "1", name: "Store A", address: "123 Main St", distance: 0.5, totalPriceCents: 1200 },
    ];

    const { getByText } = render(<MiniStoreList stores={mockStores} onStorePress={mockOnPress} />);

    fireEvent.press(getByText("Store A"));
    expect(mockOnPress).toHaveBeenCalledWith("1");
  });

  describe("distance formatting", () => {
    it("formats distances under 1km in meters", () => {
      const mockStores = [
        { id: "1", name: "Store A", address: "123 Main St", distance: 0.5, totalPriceCents: 1200 },
        { id: "2", name: "Store B", address: "456 Oak Ave", distance: 0.05, totalPriceCents: 1500 },
        { id: "3", name: "Store C", address: "789 Pine Rd", distance: 0.99, totalPriceCents: 1000 },
      ];

      const { getByText } = render(<MiniStoreList stores={mockStores} onStorePress={jest.fn()} />);

      expect(getByText("500m")).toBeTruthy();
      expect(getByText("50m")).toBeTruthy();
      expect(getByText("990m")).toBeTruthy();
    });

    it("formats distances 1km and over in kilometers", () => {
      const mockStores = [
        { id: "1", name: "Store A", address: "123 Main St", distance: 1.0, totalPriceCents: 1200 },
        { id: "2", name: "Store B", address: "456 Oak Ave", distance: 1.2, totalPriceCents: 1500 },
        { id: "3", name: "Store C", address: "789 Pine Rd", distance: 10.5, totalPriceCents: 1000 },
      ];

      const { getByText } = render(<MiniStoreList stores={mockStores} onStorePress={jest.fn()} />);

      expect(getByText("1.0km")).toBeTruthy();
      expect(getByText("1.2km")).toBeTruthy();
      expect(getByText("10.5km")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("renders empty state when no stores provided", () => {
      const { queryByText } = render(<MiniStoreList stores={[]} onStorePress={jest.fn()} />);

      expect(queryByText(/Store/)).toBeNull();
    });

    it("limits to 5 stores when more are provided", () => {
      const mockStores = [
        { id: "1", name: "Store A", address: "123 Main St", distance: 0.5, totalPriceCents: 1200 },
        { id: "2", name: "Store B", address: "456 Oak Ave", distance: 1.2, totalPriceCents: 1500 },
        { id: "3", name: "Store C", address: "789 Pine Rd", distance: 2.0, totalPriceCents: 1000 },
        { id: "4", name: "Store D", address: "321 Elm St", distance: 3.0, totalPriceCents: 1800 },
        { id: "5", name: "Store E", address: "654 Birch Dr", distance: 4.5, totalPriceCents: 1100 },
        { id: "6", name: "Store F", address: "987 Cedar Ln", distance: 5.0, totalPriceCents: 2000 },
      ];

      const { getByText, queryByText } = render(
        <MiniStoreList stores={mockStores} onStorePress={jest.fn()} />
      );

      expect(getByText("Store A")).toBeTruthy();
      expect(getByText("Store B")).toBeTruthy();
      expect(getByText("Store C")).toBeTruthy();
      expect(getByText("Store D")).toBeTruthy();
      expect(getByText("Store E")).toBeTruthy();
      expect(queryByText("Store F")).toBeNull();
    });
  });
});
