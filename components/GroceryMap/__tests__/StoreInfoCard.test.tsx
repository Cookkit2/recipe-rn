import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { StoreInfoCard } from "../StoreInfoCard";

describe("StoreInfoCard", () => {
  it("renders store details", () => {
    const mockStore = {
      name: "Store A",
      address: "123 Main St",
      distance: 0.5,
      totalPriceCents: 1200,
      isOpen: true,
      closingTime: "22:00",
    };

    const { getByText } = render(
      <StoreInfoCard store={mockStore} onPressViewPrices={jest.fn()} onPressNavigate={jest.fn()} />
    );

    expect(getByText("Store A")).toBeTruthy();
    expect(getByText("123 Main St")).toBeTruthy();
  });

  it("calls onPressViewPrices when button tapped", () => {
    const mockOnViewPrices = jest.fn();
    const mockStore = {
      name: "Store A",
      address: "123 Main St",
      distance: 0.5,
      totalPriceCents: 1200,
      isOpen: true,
      closingTime: "22:00",
    };

    const { getByTestId } = render(
      <StoreInfoCard
        store={mockStore}
        onPressViewPrices={mockOnViewPrices}
        onPressNavigate={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("viewPricesButton"));
    expect(mockOnViewPrices).toHaveBeenCalled();
  });

  it("calls onPressNavigate when button tapped", () => {
    const mockOnNavigate = jest.fn();
    const mockStore = {
      name: "Store A",
      address: "123 Main St",
      distance: 0.5,
      totalPriceCents: 1200,
      isOpen: true,
      closingTime: "22:00",
    };

    const { getByTestId } = render(
      <StoreInfoCard
        store={mockStore}
        onPressViewPrices={jest.fn()}
        onPressNavigate={mockOnNavigate}
      />
    );

    fireEvent.press(getByTestId("navigateButton"));
    expect(mockOnNavigate).toHaveBeenCalled();
  });

  it("displays closed status when store is closed", () => {
    const mockStore = {
      name: "Store B",
      address: "456 Oak Ave",
      distance: 1.2,
      totalPriceCents: 1500,
      isOpen: false,
      closingTime: undefined,
    };

    const { getByText } = render(
      <StoreInfoCard store={mockStore} onPressViewPrices={jest.fn()} onPressNavigate={jest.fn()} />
    );

    expect(getByText("Closed")).toBeTruthy();
  });
});
