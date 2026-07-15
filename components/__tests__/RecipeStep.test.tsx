import * as ReactTesting from "react-test-renderer";
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
  it("triggers haptics on press", () => {
    const step = {
      step: 1,
      title: "Test",
      description: "Test description",
      relatedIngredientIds: [],
    };

    let root: any;
    ReactTesting.act(() => {
      root = ReactTesting.create(<RecipeStep step={step} />);
    });

    const checkbox = root.root.findByProps({ accessibilityRole: "checkbox" });

    ReactTesting.act(() => {
      checkbox.props.onPress();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});
