import React from "react";
import { StyleSheet, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import StepCard from "~/components/Recipe/Step/StepCard";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import { window } from "~/constants/sizes";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StepCarousel() {
  const { top, bottom } = useSafeAreaInsets();
  const { setCurrentStep, stepPages, carouselRef, progress } = useRecipeSteps();

  const PAGE_WIDTH = window.width;
  const PAGE_HEIGHT = window.height - top - bottom;

  return (
    <View className="flex-1">
      <Carousel
        ref={carouselRef}
        data={stepPages}
        width={PAGE_WIDTH}
        height={PAGE_HEIGHT - 120} // Account for progress bar and navigation
        loop={false}
        pagingEnabled={true}
        snapEnabled={true}
        style={styles.carousel}
        mode={"horizontal-stack"}
        modeConfig={{
          snapDirection: "left",
          moveSize: PAGE_WIDTH * 1.5,
          scaleInterval: 0.08,
          rotateZDeg: 8,
          opacityInterval: 0,
        }}
        customConfig={() => ({ type: "positive", viewCount: 3 })}
        onSnapToItem={(index) => setCurrentStep(index)}
        onProgressChange={(offsetProgress, absoluteProgress) => {
          progress.value = absoluteProgress;
        }}
        renderItem={({ item, animationValue }) => (
          <StepCard
            key={item.step}
            data={item}
            animationValue={animationValue}
          />
        )}
      />
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
