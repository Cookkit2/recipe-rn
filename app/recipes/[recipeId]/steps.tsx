import React, { useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import Carousel from "react-native-reanimated-carousel";
import { window } from "~/constants/sizes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getRecipeById } from "~/data/dummy-recipes";
import type { RecipeIngredient, RecipeStep } from "~/types/Recipe";
import { Progress } from "~/components/ui/progress";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-nativewind";
import { Button } from "~/components/ui/button";
import StepCard from "~/components/Steps/StepCard";

export type StepPageData = {
  type: "ingredients" | "step";
  title: string;
  content: RecipeIngredient[] | RecipeStep;
  imageUrl?: string;
};

export default function RecipeSteps() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const recipe = useMemo(
    () => (typeof recipeId === "string" ? getRecipeById(recipeId) : undefined),
    [recipeId]
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  const stepPages = useMemo((): StepPageData[] => {
    if (!recipe) return [];

    const pages: StepPageData[] = [
      {
        type: "ingredients",
        title: "Ingredients",
        content: recipe.ingredients,
        imageUrl: recipe.imageUrl,
      },
    ];

    recipe.instructions.forEach((step) => {
      pages.push({
        type: "step",
        title: `Step ${step.stepNumber}`,
        content: step,
        imageUrl: step.imageUrl || recipe.imageUrl,
      });
    });

    return pages;
  }, [recipe]);

  const { top, bottom } = useSafeAreaInsets();
  const ref = React.useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);

  const PAGE_WIDTH = window.width;
  const PAGE_HEIGHT = window.height - top - bottom;

  const progressPercentage =
    stepPages.length > 0 ? ((currentIndex + 1) / stepPages.length) * 100 : 0;

  const goToNext = () => {
    if (currentIndex < stepPages.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      ref.current?.scrollTo({ index: nextIndex, animated: true });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      ref.current?.scrollTo({ index: prevIndex, animated: true });
    }
  };

  if (!recipe || stepPages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-500">Recipe not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Progress Bar */}
      <View
        className="flex flex-row items-center gap-4 px-4"
        style={{ paddingTop: top + 8 }}
      >
        <Progress value={progressPercentage} className="flex-1 h-6" />
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          onPress={() => router.back()}
        >
          <XIcon className="text-foreground" />
        </Button>
      </View>

      {/* Main Content */}
      <View className="flex-1">
        <Carousel
          ref={ref}
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
          onSnapToItem={(index) => setCurrentIndex(index)}
          onProgressChange={(offsetProgress, absoluteProgress) => {
            progress.value = absoluteProgress;
          }}
          renderItem={({ index, item, animationValue }) => (
            <StepCard
              key={index}
              data={item}
              recipe={recipe}
              index={index}
              animationValue={animationValue}
            />
          )}
        />
      </View>

      {/* Navigation Buttons */}
      <View
        className="flex-row justify-between items-center px-6 py-4 bg-background border-t border-border"
        style={{ paddingBottom: bottom + 16 }}
      >
        <Button
          onPress={goToPrevious}
          disabled={currentIndex === 0}
          variant="secondary"
          size="icon"
        >
          <ArrowLeftIcon size={20} className="text-foreground" />
        </Button>
        <Button
          onPress={goToNext}
          disabled={currentIndex === stepPages.length - 1}
          variant="default"
          size="icon"
        >
          <ArrowRightIcon size={20} className="text-background" />
        </Button>
      </View>
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
