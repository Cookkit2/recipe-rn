import React, { useCallback } from "react";
import { Carousel } from "react-native-reanimated-carousel";
import StepCard from "~/components/Recipe/Step/StepCard";
import { StyleSheet, View } from "react-native";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { window } from "~/constants/sizes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Extrapolation, interpolate } from "react-native-reanimated";

interface StepCarouselProps {
  recipeId: string;
  onOpenAddTimerDialog: () => void;
}

export default function StepCarousel({ recipeId, onOpenAddTimerDialog }: StepCarouselProps) {
  const { top, bottom } = useSafeAreaInsets();
  const { setCurrentStep, stepPages, carouselRef, progress, currentStep } = useRecipeSteps();

  const PAGE_WIDTH = window.width;
  const PAGE_HEIGHT = window.height - top - bottom;

  const animationStyle = useCallback((value: number, index: number) => {
    "worklet";
    const translateY = interpolate(value, [0, 1], [0, -18]);

    const translateX = interpolate(
      value,
      [-1, 0, 1],
      [-PAGE_WIDTH * 1.5, 0, 6],
      Extrapolation.CLAMP
    );

    const rotateZ = interpolate(value, [-1, 0, 1], [-2, 0, 2], Extrapolation.CLAMP);

    const zIndex = -10 * index;

    const scale = interpolate(value, [0, 1], [1, 0.95]);

    return {
      transform: [{ translateY }, { translateX }, { rotateZ: `${rotateZ}deg` }, { scale }],
      zIndex,
    };
  }, []);

  return (
    <View className="flex-1">
      <View className="flex-1">
        <Carousel
          ref={carouselRef}
          data={stepPages}
          itemSize={PAGE_WIDTH}
          loop={false}
          style={[styles.carousel, { height: PAGE_HEIGHT - 120 }]}
          itemAnimation={animationStyle}
          onSnapToItem={(index) => {
            setCurrentStep(index);
          }}
          progress={progress}
          renderWindowSize={stepPages.length}
          renderItem={({ item, relativeProgress, index }) => (
            <StepCard key={item.step} index={index} data={item} animationValue={relativeProgress} />
          )}
        />
      </View>
      {/* <StepTimer onOpenAddTimerDialog={onOpenAddTimerDialog} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
