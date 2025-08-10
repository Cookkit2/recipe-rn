import React, { useMemo, useState } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import Carousel from "react-native-reanimated-carousel";
import { window } from "~/constants/sizes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getRecipeById,
  type Recipe,
  type RecipeIngredient,
  type RecipeStep,
} from "~/data/dummy-recipes";
import { Progress } from "~/components/ui/progress";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "~/lib/icons/Back";
import { Button } from "~/components/ui/button";
import { H1 } from "~/components/ui/typography";
import { IngredientsContent } from "~/components/Steps/IngredientContent";
import StepContent from "~/components/Steps/StepContent";

interface StepPageData {
  type: "ingredients" | "step";
  title: string;
  content: RecipeIngredient[] | RecipeStep;
  imageUrl?: string;
}

const SHADOW_COLOR = "#000000";
const CARD_BACKGROUND_COLOR = "#ffffff";

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
            // stackInterval: 12,
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
            <StepPageItem
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
        className="flex-row justify-between items-center px-6 py-4 bg-background border-t border-gray-200"
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

const StepPageItem: React.FC<{
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
      style={[styles.cardContainer, styles.cardShadow, cardStyle, shadowStyle]}
    >
      {/* Content */}
      <H1 className=" text-center mb-6 text-foreground">{data.title}</H1>

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

const styles = StyleSheet.create({
  carousel: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 48,
    marginHorizontal: 32,
    backgroundColor: CARD_BACKGROUND_COLOR,
    borderRadius: 24,
    padding: 20,
    minHeight: window.height * 0.6,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  cardShadow: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
});
