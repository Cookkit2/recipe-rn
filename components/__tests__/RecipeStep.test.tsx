import { render, fireEvent, act } from "@testing-library/react-native";
import { RecipeStep } from "../RecipeStep";
import * as Haptics from "expo-haptics";
import React from "react";
import { View } from "react-native";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
  },
}));

jest.mock("lucide-uniwind", () => ({
  CheckIcon: () => <View testID="check-icon" />,
}));

describe("RecipeStep", () => {
  it("triggers haptics on press", async () => {
    const step = {
      step: 1,
      title: "Test",
      description: "Test description",
      relatedIngredientIds: [],
    };
    const { getByLabelText } = await render(<RecipeStep step={step} />);
    const checkbox = getByLabelText("Mark step 1 complete");
    act(() => {
      fireEvent.press(checkbox);
    });
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});
