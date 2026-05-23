import { describe, it, expect, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import React from "react";
import { useRecipeSteps } from "~/store/RecipeStepsContext";

jest.mock("~/store/RecipeStepsContext", () => ({
  useRecipeSteps: jest.fn(),
}));

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native") as any;
  RN.Alert.alert = jest.fn();
  return RN;
});

jest.mock("~/components/ui/typography", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    H2: (props: any) => React.createElement(Text, props),
    P: (props: any) => React.createElement(Text, props),
    Small: (props: any) => React.createElement(Text, props),
  };
});

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, { testID: "image" }) };
});

jest.mock("~/components/ui/button", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    Button: ({ onPress, children, testID }: any) =>
      React.createElement(Pressable, { onPress, testID }, children),
  };
});

jest.mock("~/components/Recipe/Details/WriteReviewModal", () => {
  const React = require("react");
  return () => React.createElement("write-review-modal");
});

jest.mock("@expo/ui/community/masked-view", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) => React.createElement(View, props, props.children);
});

jest.mock("~/components/Shared/Shapes/ShapeContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "shape-container" });
});

jest.mock("~/components/Recipe/Step/RateRecipeModal", () => {
  const React = require("react");
  return function MockRateRecipeModal({ modalVisible }: { modalVisible: boolean }) {
    return modalVisible ? React.createElement("rate-recipe-modal") : null;
  };
});

jest.mock("uniwind", () => ({
  useUniwind: () => ({ theme: "light" }),
}));

jest.mock("~/hooks/queries/useFeatureFlags", () => ({
  useFeatureFlag: () => ({ enabled: false }),
}));

jest.mock("~/hooks/queries/useReviewQueries", () => ({
  useCreateReview: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("~/hooks/queries/useCookingHistoryQueries", () => ({
  useRecordCooking: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("~/utils/time-formatter", () => ({
  formatDuration: (ms: number) => `${Math.round(ms / 60000)} min`,
}));

jest.mock("~/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

const mockUseRecipeSteps = jest.mocked(useRecipeSteps);

describe("CongratulationsContent", () => {
  it("does not render the rating modal when rateModalVisible is false", () => {
    mockUseRecipeSteps.mockReturnValue({
      recipe: {
        id: "recipe-1",
        title: "Test Pasta",
        imageUrl: "https://example.com/pasta.jpg",
        ingredients: [],
        instructions: [],
      },
      duration: 5 * 60 * 1000,
      showRatingModal: true,
      closeRatingModal: jest.fn(),
      saveRatingAndComplete: jest.fn(),
      skipRatingAndComplete: jest.fn(),
      isCompletingRecipe: false,
    } as unknown as ReturnType<typeof useRecipeSteps>);

    const CongratulationsContent = require("../CongratulationsContent").default;
    const { queryByText } = render(React.createElement(CongratulationsContent));

    expect(queryByText("Test Pasta")).toBeTruthy();
  });
});
