import React from "react";
import CongratulationsContent from "../CongratulationsContent";
import RateRecipeModal from "~/components/Recipe/Step/RateRecipeModal";
import { useRecipeSteps } from "~/store/RecipeStepsContext";

jest.mock("~/store/RecipeStepsContext", () => ({
  useRecipeSteps: jest.fn(),
}));

jest.mock("react-native", () => ({
  View: "div",
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
}));

jest.mock("~/components/ui/typography", () => ({
  H2: "h2",
  P: "p",
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("@react-native-masked-view/masked-view", () => () => null);

jest.mock("~/components/Shared/Shapes/ShapeContainer", () => () => null);

jest.mock("~/components/Recipe/Step/RateRecipeModal", () => {
  return function MockRateRecipeModal({ modalVisible }: { modalVisible: boolean }) {
    return modalVisible ? React.createElement("rate-recipe-modal") : null;
  };
});

jest.mock("uniwind", () => ({
  useUniwind: () => ({ theme: "light" }),
}));

const mockUseRecipeSteps = jest.mocked(useRecipeSteps);

const hasElementType = (node: React.ReactNode, type: React.ElementType): boolean => {
  if (Array.isArray(node)) {
    return node.some((child) => hasElementType(child, type));
  }

  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return false;
  }

  return node.type === type || hasElementType(node.props.children, type);
};

describe("CongratulationsContent", () => {
  it("does not render the rating modal", () => {
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

    const element = CongratulationsContent();

    expect(hasElementType(element, RateRecipeModal)).toBe(false);
  });
});
