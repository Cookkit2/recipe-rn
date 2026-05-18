import { describe, it, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";
import { RecipeStep } from "../RecipeStep";
import type { RecipeStep as RecipeStepType } from "~/types/Recipe";

// Mock the icons to simplify rendering
jest.mock("lucide-uniwind", () => ({
  CheckIcon: () => <View testID="check-icon" />,
}));

describe("RecipeStep", () => {
  const mockStep: RecipeStepType = {
    step: 1,
    title: "Chop veggies",
    description: "Dice the onions and tomatoes",
    relatedIngredientIds: ["ing-1", "ing-2"],
  };

  it("should render the step number, title, and description correctly", () => {
    const { getByText, queryByTestId } = render(<RecipeStep step={mockStep} />);

    expect(getByText("1")).toBeTruthy();
    expect(getByText("Chop veggies")).toBeTruthy();
    expect(getByText("Dice the onions and tomatoes")).toBeTruthy();
    // By default, it shouldn't be completed, so no check icon
    expect(queryByTestId("check-icon")).toBeNull();
  });

  it("should toggle completion state on press", () => {
    const { getByText, getByTestId, queryByText, queryByTestId } = render(
      <RecipeStep step={mockStep} />
    );

    const stepElement = getByText("Chop veggies");

    // Initially not completed
    expect(queryByTestId("check-icon")).toBeNull();
    expect(getByText("1")).toBeTruthy();

    // Press to complete
    fireEvent.press(stepElement);

    // Should now show check icon and not show the step number
    expect(getByTestId("check-icon")).toBeTruthy();
    expect(queryByText("1")).toBeNull();

    // Press again to uncomplete
    fireEvent.press(stepElement);

    // Should revert back to step number
    expect(queryByTestId("check-icon")).toBeNull();
    expect(getByText("1")).toBeTruthy();
  });

  it("should apply border-b class when isLast is false (default)", () => {
    const { getByRole } = render(<RecipeStep step={mockStep} />);

    const pressable = getByRole("checkbox");
    expect(pressable.props.className).toContain("border-b");
    expect(pressable.props.className).toContain("border-border/40");
  });

  it("should not apply border-b class when isLast is true", () => {
    const { getByRole } = render(<RecipeStep step={mockStep} isLast={true} />);

    const pressable = getByRole("checkbox");
    expect(pressable.props.className).not.toContain("border-b border-border/40");
  });

  it("should have correct accessibility attributes", () => {
    const { getByRole } = render(<RecipeStep step={mockStep} />);

    const pressable = getByRole("checkbox");
    expect(pressable.props.accessibilityRole).toBe("checkbox");
    expect(pressable.props.accessibilityLabel).toBe("Mark step 1 complete");
    expect(pressable.props.accessibilityState).toEqual({ checked: false });

    fireEvent.press(pressable);

    expect(pressable.props.accessibilityState).toEqual({ checked: true });
  });
});
