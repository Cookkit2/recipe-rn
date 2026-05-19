import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { StoreMarker } from "../StoreMarker";

describe("StoreMarker", () => {
  it("renders formatted price correctly", () => {
    const { getByText } = render(<StoreMarker totalPriceCents={1250} />);
    expect(getByText("MYR 12.50")).toBeTruthy();
  });

  it("renders formatted price correctly with different values", () => {
    const { getByText } = render(<StoreMarker totalPriceCents={2500} />);
    expect(getByText("MYR 25.00")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<StoreMarker totalPriceCents={1000} onPress={onPress} />);

    const pressable = getByLabelText("Store with price MYR 10.00");
    fireEvent.press(pressable);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders without press handler (no crash)", () => {
    const { queryByLabelText } = render(<StoreMarker totalPriceCents={1500} />);

    // Should not have a pressable button when onPress is not provided
    expect(queryByLabelText("Store with price MYR 15.00")).toBeNull();
  });

  it("renders without press handler but still shows price", () => {
    const { getByText, queryByLabelText } = render(<StoreMarker totalPriceCents={2000} />);

    // Price should still be displayed
    expect(getByText("MYR 20.00")).toBeTruthy();
    // But no pressable button
    expect(queryByLabelText("Store with price MYR 20.00")).toBeNull();
  });
});
