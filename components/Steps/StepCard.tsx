import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import type { Recipe, RecipeIngredient, RecipeStep } from "~/types/Recipe";
import { H1 } from "../ui/typography";
import { IngredientsContent } from "./IngredientContent";
import StepContent from "./StepContent";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";
import { window } from "~/constants/sizes";

const StepCard: React.FC<{
  data: StepPageData;
  recipe: Recipe;
  index: number;
  animationValue: Animated.SharedValue<number>;
}> = ({ data, animationValue }) => {
  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      animationValue.value,
      [-1, 0, 1],
      [50, 0, 50],
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
      [-1, 0, 1],
      [0.1, 0.3, 0.1],
      Extrapolation.CLAMP
    );

    return {
      shadowOpacity: withSpring(shadowOpacity),
    };
  });

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className="flex-1 justify-center items-center my-12 mx-8 bg-muted rounded-3xl p-5 shadow-md border-continuous"
      style={[styles.cardContainer, cardStyle, shadowStyle]}
    >
      {/* Content */}
      <H1 className="text-center mb-6 text-foreground">{data.title}</H1>

      <View className="flex-1 w-full">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {data.type === "ingredients" ? (
            <IngredientsContent
              ingredients={data.content as RecipeIngredient[]}
            />
          ) : (
            <StepContent step={data.content as RecipeStep} />
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

export default StepCard;

const styles = StyleSheet.create({
  cardContainer: {
    minHeight: window.height * 0.6,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
});
