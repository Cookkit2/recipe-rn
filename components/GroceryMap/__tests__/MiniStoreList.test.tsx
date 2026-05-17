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
});
