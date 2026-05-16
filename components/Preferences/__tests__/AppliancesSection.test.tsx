import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import AppliancesSection from "../AppliancesSection";
import useLocalStorageState from "~/hooks/useLocalStorageState";

// Mock the hook
jest.mock("~/hooks/useLocalStorageState", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Provide base implementations for UI components if needed
jest.mock("~/components/ui/card", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Card: ({ children, testID, ...props }: any) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    CardContent: ({ children, testID, ...props }: any) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
  };
});

jest.mock("~/components/ui/typography", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    H4: ({ children, testID, ...props }: any) => (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    ),
    P: ({ children, testID, ...props }: any) => (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    ),
  };
});

// Mock icons
jest.mock("lucide-uniwind", () => ({
  CookingPotIcon: () => null,
  PlugIcon: () => null,
  MicrowaveIcon: () => null,
  WheatIcon: () => null,
  FlameIcon: () => null,
  FanIcon: () => null,
}));

// Mock GridButtons
jest.mock("~/components/Shared/GridButtons", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");

  return {
    __esModule: true,
    default: ({ buttons, value, onValueChange, testID }: any) => (
      <View testID={testID || "grid-buttons"}>
        {buttons.map((btn: any) => (
          <TouchableOpacity
            key={btn.value}
            testID={`btn-${btn.value}`}
            onPress={() => onValueChange(btn.value)}
          >
            <Text>{btn.label}</Text>
            {value && value.includes(btn.value) ? (
              <Text testID={`selected-${btn.value}`}>Selected</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

describe("AppliancesSection", () => {
  const mockSetAppliances = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalStorageState as jest.Mock).mockReturnValue([[], mockSetAppliances]);
  });

  it("should render correctly", () => {
    const { getByText } = render(<AppliancesSection />);

    expect(getByText("Cooking Appliances")).toBeTruthy();
    expect(getByText("Select all that apply")).toBeTruthy();
    expect(getByText("Stovetop")).toBeTruthy();
    expect(getByText("Electric Pot")).toBeTruthy();
    expect(getByText("Oven")).toBeTruthy();
    expect(getByText("Rice cooker")).toBeTruthy();
    expect(getByText("Air fryer")).toBeTruthy();
    expect(getByText("Blender")).toBeTruthy();
  });

  it("should handle toggling an appliance", () => {
    const { getByTestId } = render(<AppliancesSection />);

    fireEvent.press(getByTestId("btn-stovetop"));

    // Simulate what handleToggleAppliance does:
    // It calls setAppliances with an updater function
    expect(mockSetAppliances).toHaveBeenCalled();
    const calls = mockSetAppliances.mock.calls;
    if (!calls || calls.length === 0) {
      throw new Error("mockSetAppliances was not called");
    }
    const updaterFn = calls[0]?.[0] as (prev: string[]) => string[];

    // Test the updater function
    // If previous was [], it should add stovetop
    expect(updaterFn([])).toEqual(["stovetop"]);

    // If previous had stovetop, it should remove it
    expect(updaterFn(["stovetop"])).toEqual([]);
  });

  it("should render selected state for saved appliances", () => {
    (useLocalStorageState as jest.Mock).mockReturnValue([["oven", "air-fryer"], mockSetAppliances]);

    const { getByTestId } = render(<AppliancesSection />);

    expect(getByTestId("selected-oven")).toBeTruthy();
    expect(getByTestId("selected-air-fryer")).toBeTruthy();
  });

  describe("useLocalStorageState serializer", () => {
    it("should correctly parse and stringify values", () => {
      // We need to test the serializer provided to useLocalStorageState
      // Since it's an inline object, we need to extract it by rendering
      // the component and capturing the arguments passed to the mock
      render(<AppliancesSection />);

      const calls = (useLocalStorageState as jest.Mock).mock.calls;
      if (!calls || calls.length === 0) {
        throw new Error("useLocalStorageState was not called");
      }

      const configArg = calls[0]?.[1] as any;
      const { serializer } = configArg;

      // Test stringify
      expect(serializer.stringify(["oven", "blender"])).toBe(JSON.stringify(["oven", "blender"]));

      // Test parse with empty/null
      expect(serializer.parse("")).toEqual([]);
      expect(serializer.parse(null)).toEqual([]);

      // Test parse with JSON array
      expect(serializer.parse(JSON.stringify(["oven", "blender"]))).toEqual(["oven", "blender"]);

      // Test parse with JSON non-array (should return empty array)
      expect(serializer.parse(JSON.stringify({ some: "object" }))).toEqual([]);

      // Test parse with comma-separated string (fallback)
      expect(serializer.parse("oven,blender")).toEqual(["oven", "blender"]);
    });
  });
});
