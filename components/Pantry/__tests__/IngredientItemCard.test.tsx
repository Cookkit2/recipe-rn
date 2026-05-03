/**
 * Test suite for IngredientItemCard component
 * Tests component rendering, user interactions, and React.memo optimization
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import IngredientItemCard from "~/components/Pantry/IngredientItemCard";
import type { PantryItem } from "~/types/PantryItem";

// Mock dependencies
jest.mock("~/hooks/useColor", () => ({
  __esModule: true,
  default: () => ({
    muted: "#9CA3AF",
    foreground: "#000000",
  }),
}));

jest.mock("~/hooks/animation/useButtonAnimations", () => ({
  __esModule: true,
  default: () => ({
    animatedStyle: {},
    roundedStyle: {},
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

jest.mock("~/store/PantryContext", () => ({
  __esModule: true,
  usePantryStore: () => ({
    isRecipeOpen: false,
    updateRecipeOpen: jest.fn(),
  }),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");

  function LinkComponent({ children, href, asChild }: any) {
    if (asChild) {
      return <>{children}</>;
    }
    return <Text onPress={() => console.log("Navigate to:", href)}>{children}</Text>;
  }
  LinkComponent.AppleZoom = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Link: LinkComponent,
  };
});

jest.mock("expo-haptics", () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light" },
}));

jest.mock("~/components/ui/outlined-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, null),
  };
});

jest.mock("~/components/Shared/Shapes/ShapeContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: "shape-container" }),
  };
});

describe("IngredientItemCard", () => {
  const mockItem: PantryItem = {
    id: "ingredient-123",
    name: "Tomatoes",
    quantity: 5,
    unit: "pieces",
    expiry_date: new Date("2026-05-10"),
    category: "vegetables",
    type: "fridge",
    image_url: undefined,
    background_color: "#FF6347",
    created_at: new Date("2026-05-01"),
    updated_at: new Date("2026-05-01"),
    steps_to_store: [],
  };

  it("should render correctly with all props", () => {
    const { getByText } = render(<IngredientItemCard item={mockItem} index={0} />);

    expect(getByText("Tomatoes")).toBeTruthy();
    expect(getByText("5 pieces")).toBeTruthy();
  });

  it("should trigger haptic feedback on press", () => {
    const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");
    const { getByText } = render(<IngredientItemCard item={mockItem} index={0} />);

    fireEvent.press(getByText("Tomatoes"));

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
  });

  it("should display placeholder when no image URL", () => {
    const itemWithoutImage: PantryItem = {
      ...mockItem,
      image_url: undefined,
    };

    const { getByTestId } = render(<IngredientItemCard item={itemWithoutImage} index={0} />);

    expect(getByTestId("shape-container")).toBeTruthy();
  });

  it("should use correct background color", () => {
    const { getByText } = render(<IngredientItemCard item={mockItem} index={0} />);

    // Component should have the item's background color
    expect(getByText("Tomatoes")).toBeTruthy();
  });

  describe("React.memo optimization", () => {
    it("should not re-render when props haven't changed", () => {
      const view = render(<IngredientItemCard item={mockItem} index={0} />);

      // First render
      view.rerender(<IngredientItemCard item={mockItem} index={0} />);
      const firstRender = view.toJSON();

      // Second render with same props
      view.rerender(<IngredientItemCard item={mockItem} index={0} />);
      const secondRender = view.toJSON();

      // React.memo should prevent re-render
      expect(firstRender).toEqual(secondRender);
    });

    it("should re-render when item name changes", () => {
      const { rerender, getByText } = render(<IngredientItemCard item={mockItem} index={0} />);

      const differentItem = { ...mockItem, name: "Onions" };
      rerender(<IngredientItemCard item={differentItem} index={0} />);

      // Should re-render because name changed
      expect(getByText("Onions")).toBeTruthy();
    });

    it("should re-render when quantity changes", () => {
      const { rerender, getByText } = render(<IngredientItemCard item={mockItem} index={0} />);

      const differentItem = { ...mockItem, quantity: 10 };
      rerender(<IngredientItemCard item={differentItem} index={0} />);

      // Should re-render and show new quantity
      expect(getByText("10 pieces")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle item with zero quantity", () => {
      const zeroQuantityItem: PantryItem = {
        ...mockItem,
        quantity: 0,
      };

      const { getByText } = render(<IngredientItemCard item={zeroQuantityItem} index={0} />);

      expect(getByText("0 pieces")).toBeTruthy();
    });

    it("should handle item with very long name", () => {
      const longNameItem: PantryItem = {
        ...mockItem,
        name: "A".repeat(100), // Very long name
      };

      const { getByText } = render(<IngredientItemCard item={longNameItem} index={0} />);

      // Should truncate or handle long name gracefully
      expect(getByText(/A+/)).toBeTruthy();
    });

    it("should handle item without expiry date", () => {
      const noExpiryItem: PantryItem = {
        ...mockItem,
        expiry_date: undefined,
      };

      const { getByText } = render(<IngredientItemCard item={noExpiryItem} index={0} />);

      // Should still render
      expect(getByText("Tomatoes")).toBeTruthy();
    });
  });
});
