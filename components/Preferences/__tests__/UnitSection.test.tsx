import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import UnitSection from "~/components/Preferences/UnitSection";
import { database, storage } from "~/data";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";
import { toast } from "sonner-native";

// Mock dependencies
jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
  database: {
    convertUnits: jest.fn().mockReturnValue(Promise.resolve(undefined)),
  },
}));

jest.mock("~/hooks/queries/usePantryQueries", () => ({
  useRefreshPantryItems: () => ({ refresh: jest.fn() }),
}));

jest.mock("~/hooks/queries/useRecipeQueries", () => ({
  useRefreshRecipes: () => ({ refresh: jest.fn() }),
}));

jest.mock("sonner-native", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("~/utils/logger", () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("~/components/Shared/SegmentedButtons", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");

  return {
    __esModule: true,
    default: ({ buttons, value, onValueChange }: any) => (
      <View testID="segmented-buttons">
        {buttons.map((button: any) => (
          <TouchableOpacity key={button.value} onPress={() => onValueChange(button.value)}>
            <Text>{button.label}</Text>
          </TouchableOpacity>
        ))}
        <Text testID="current-value">{value}</Text>
      </View>
    ),
  };
});

describe("UnitSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render correctly with default value", () => {
    (storage.get as jest.Mock).mockReturnValue("metric");

    const { getByText, getByTestId } = render(<UnitSection />);

    expect(getByText("Units")).toBeTruthy();
    expect(getByText("Choose your preferred measurement system")).toBeTruthy();
    expect(getByText("Metric")).toBeTruthy();
    expect(getByText("Imperial")).toBeTruthy();
    expect(getByTestId("current-value").props.children).toBe("metric");
  });

  it("should use imperial if stored as imperial", () => {
    (storage.get as jest.Mock).mockReturnValue("imperial");

    const { getByText, getByTestId } = render(<UnitSection />);

    expect(getByText("Units")).toBeTruthy();
    expect(getByTestId("current-value").props.children).toBe("imperial");
  });

  it("should fallback to metric for unknown legacy values", () => {
    (storage.get as jest.Mock).mockReturnValue("si");

    const { getByTestId } = render(<UnitSection />);

    expect(getByTestId("current-value").props.children).toBe("metric");
  });

  it("should convert units when a different unit is selected", async () => {
    (storage.get as jest.Mock).mockReturnValue("metric");

    const { getByText, getByTestId } = render(<UnitSection />);

    fireEvent.press(getByText("Imperial"));

    await waitFor(() => {
      expect(storage.set).toHaveBeenCalledWith(PREF_UNIT_SYSTEM_KEY, "imperial");
      expect(database.convertUnits).toHaveBeenCalledWith("imperial");
      expect(getByTestId("current-value").props.children).toBe("imperial");
    });
  });

  it("should handle conversion errors and revert state", async () => {
    (storage.get as jest.Mock).mockReturnValue("metric");
    (database.convertUnits as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("Database error"))
    );

    const { getByText, getByTestId } = render(<UnitSection />);

    fireEvent.press(getByText("Imperial"));

    await waitFor(() => {
      // First it tries to set it
      expect(storage.set).toHaveBeenCalledWith(PREF_UNIT_SYSTEM_KEY, "imperial");
      // Then it fails and reverts
      expect(storage.set).toHaveBeenCalledWith(PREF_UNIT_SYSTEM_KEY, "metric");
      expect(toast.error).toHaveBeenCalledWith("Failed to convert units");
      expect(getByTestId("current-value").props.children).toBe("metric");
    });
  });
});
