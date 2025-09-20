import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  useSharedValue,
  withTiming,
  withDelay,
  type SharedValue,
  Easing,
} from "react-native-reanimated";
import type { RecipeIngredient, RecipeStep } from "~/types/Recipe";
import type { StepPageData } from "~/app/[recipeId]/steps";
import { IngredientsContent } from "./IngredientContent";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import StepContent from "./StepContent";
import CongratulationsContent from "./CongratulationsContent";
import { CURVES } from "~/constants/curves";

const StepCard: React.FC<{
  index: number;
  data: StepPageData;
  animationValue: SharedValue<number>;
}> = ({ data, animationValue, index }) => {
  const { stepPages } = useRecipeSteps();
  const leftLength = stepPages.length - 1;

  // Falling animation values
  const fallAnimationProgress = useSharedValue(0);
  const randomRotation = useSharedValue(-3 + Math.random() * 6); // Small random rotation for final position
  const pressScale = useSharedValue(1); // Press scale animation

  useEffect(() => {
    // Start the falling animation with a delay based on index
    fallAnimationProgress.value = withDelay(
      index * 200, // Stagger the animation
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [fallAnimationProgress, index]);

  // Press handlers
  const handlePressIn = () => {
    pressScale.value = withTiming(1.02, CURVES["expressive.fast.effects"]);
    randomRotation.value = withTiming(0, CURVES["expressive.fast.effects"]);
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, CURVES["expressive.fast.effects"]);
  };

  const cardStyle = useAnimatedStyle(() => {
    // Existing card rotation and scaling based on stack position
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

    // Falling animation
    const fallY = interpolate(
      fallAnimationProgress.value,
      [0, 1],
      [-1500, 0], // Start from above the screen
      Extrapolation.CLAMP
    );

    const fallScale = interpolate(
      fallAnimationProgress.value,
      [0, 0.8, 1],
      [1.2, 0.95, 1], // Slight bounce effect
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { rotateZ: `${rotate + randomRotation.value}deg` }, // Stack rotation + random rotation
        { scale: withSpring(scale * fallScale * pressScale.value) },
        { translateY: withSpring(translateY + fallY) },
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

  let content = null;

  switch (data.type) {
    case "ingredients":
      content = (
        <IngredientsContent
          ingredients={data.content as RecipeIngredient[]}
          totalSteps={stepPages.length}
        />
      );
      break;
    case "congratulations":
      content = <CongratulationsContent />;
      break;
    case "step":
      content = (
        <StepContent
          step={data.content as RecipeStep}
          totalSteps={stepPages.length}
        />
      );
      break;
    default:
  }

  return (
    <Animated.View className="flex-1 shadow-xl mx-8 my-16" style={shadowStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="flex-1"
      >
        <Animated.View
          className="flex-1 bg-muted rounded-3xl border-continuous"
          style={[cardStyle]}
        >
          {content}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export default StepCard;
