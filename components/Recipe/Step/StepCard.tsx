import React from "react";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import type { RecipeIngredient, RecipeStep } from "~/types/Recipe";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";
import { IngredientsContent } from "./IngredientContent";
import StepContent from "./StepContent";
import { window } from "~/constants/sizes";
import { useRecipeSteps } from "~/store/context/RecipeStepsContext";

const StepCard: React.FC<{
  data: StepPageData;
  animationValue: SharedValue<number>;
}> = ({ data, animationValue }) => {
  const { stepPages } = useRecipeSteps();
  const leftLength = stepPages.length - 1;

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      animationValue.value,
      [0, leftLength],
      [0, 15],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      animationValue.value,
      [0, leftLength],
      [1, 0.85],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      animationValue.value,
      [0, leftLength],
      [0, 50],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { rotateZ: `${rotate}deg` },
        { scale: withSpring(scale) },
        { translateY: withSpring(translateY) },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      animationValue.value,
      [0, leftLength],
      [0.5, 1],
      Extrapolation.CLAMP
    );

    return { shadowOpacity: withSpring(shadowOpacity) };
  });

  return (
    <Animated.View className="flex-1 shadow-xl mx-8 my-16" style={shadowStyle}>
      <Animated.View
        className="flex-1 bg-muted rounded-3xl border-continuous"
        style={[
          {
            minHeight: window.height * 0.6,
          },
          cardStyle,
        ]}
      >
        {data.type === "ingredients" ? (
          <IngredientsContent
            ingredients={data.content as RecipeIngredient[]}
          />
        ) : (
          <StepContent step={data.content as RecipeStep} />
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default StepCard;
