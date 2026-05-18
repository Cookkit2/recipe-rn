import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import AllergySection from "../AllergySection";
import useLocalStorageState from "~/hooks/useLocalStorageState";
import { useQueryClient } from "@tanstack/react-query";
import { toggleFromArray } from "~/utils/array-helper";
import { PREF_ALLERGENS_KEY, PREF_OTHER_ALLERGENS_KEY } from "~/constants/storage-keys";

// Mock dependencies
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("~/hooks/useLocalStorageState", () => jest.fn());

jest.mock("~/utils/array-helper", () => ({
  toggleFromArray: jest.fn(),
}));

jest.mock("lucide-uniwind", () => ({
  MilkIcon: () => null,
  EggIcon: () => null,
  NutIcon: () => null,
  FishIcon: () => null,
  ShrimpIcon: () => null,
  WheatIcon: () => null,
}));

// We only want to test the presentation and interaction of GridButtons within AllergySection
jest.mock("~/components/Shared/GridButtons", () => {
  const { View, Pressable } = require("react-native");
  return function MockGridButtons({ buttons, onValueChange, value }: any) {
    return (
      <View testID="mock-grid-buttons">
        {buttons.map((btn: any) => (
          <Pressable
            key={btn.value}
            testID={`btn-${btn.value}`}
            onPress={() => onValueChange(btn.value)}
          />
        ))}
      </View>
    );
  };
});

describe("AllergySection", () => {
  const mockInvalidateQueries = jest.fn();
  let mockSetAllergens: jest.Mock;
  let mockSetOtherAllergens: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    mockSetAllergens = jest.fn();
    mockSetOtherAllergens = jest.fn();

    // Mock useLocalStorageState implementation
    (useLocalStorageState as jest.Mock).mockImplementation((key) => {
      if (key === PREF_ALLERGENS_KEY) {
        return [["milk"], mockSetAllergens];
      }
      if (key === PREF_OTHER_ALLERGENS_KEY) {
        return ["peanuts", mockSetOtherAllergens];
      }
      return [[], jest.fn()];
    });

    (toggleFromArray as jest.Mock).mockReturnValue(["milk", "eggs"]);
  });

  it("renders correctly with allergens and other allergens", () => {
    const { getByText, getByDisplayValue } = render(<AllergySection />);

    expect(getByText("Allergens")).toBeTruthy();
    expect(getByText("Other allergens (comma-separated)")).toBeTruthy();
    expect(getByDisplayValue("peanuts")).toBeTruthy();
  });

  it("toggles an allergen and invalidates queries", () => {
    const { getByTestId } = render(<AllergySection />);

    // Click on the 'eggs' button
    fireEvent.press(getByTestId("btn-eggs"));

    // Verify setAllergens was called
    expect(mockSetAllergens).toHaveBeenCalledTimes(1);

    // Simulate what the updater function does
    const updaterFunction = mockSetAllergens.mock.calls[0][0];
    const newState = updaterFunction(["milk"]);
    expect(toggleFromArray).toHaveBeenCalledWith(["milk"], "eggs");
    expect(newState).toEqual(["milk", "eggs"]);

    // Verify invalidation was triggered for both query keys
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["recipes", "recommendations"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["recipes", "expiring"],
    });
  });

  it("updates other allergens and invalidates queries", () => {
    const { getByDisplayValue } = render(<AllergySection />);

    const textInput = getByDisplayValue("peanuts");
    fireEvent.changeText(textInput, "peanuts, soy");

    expect(mockSetOtherAllergens).toHaveBeenCalledWith("peanuts, soy");

    // Verify invalidation was triggered
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["recipes", "recommendations"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["recipes", "expiring"],
    });
  });
});
