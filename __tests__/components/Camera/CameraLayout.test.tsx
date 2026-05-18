import { describe, it, expect, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";
import { View, Text } from "react-native";
import CameraLayout from "~/components/Camera/CameraLayout";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 20 }),
}));

jest.mock("~/components/Camera/IngredientHeaderRow", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => <View testID="ingredient-header-row" />,
  };
});

jest.mock("~/components/Camera/CameraOnboardingSheet", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => <View testID="camera-onboarding-sheet" />,
  };
});

describe("CameraLayout", () => {
  it("renders correctly with children", () => {
    const { getByTestId, getByText } = render(
      <CameraLayout>
        <Text>Child Component</Text>
      </CameraLayout>
    );

    expect(getByTestId("ingredient-header-row")).toBeTruthy();
    expect(getByText("Child Component")).toBeTruthy();
    expect(getByTestId("camera-onboarding-sheet")).toBeTruthy();
  });

  it("applies safe area insets correctly", () => {
    const { toJSON } = render(
      <CameraLayout>
        <Text>Child Component</Text>
      </CameraLayout>
    );

    // Test the wrapper View's style
    const tree = toJSON();
    expect((tree as any).props.style).toEqual(
      expect.objectContaining({
        paddingTop: 10,
        paddingBottom: 20,
      })
    );
  });
});
