import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H4, P } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { getRecipeById } from "~/data/dummy-recipes";
import { ScrollView } from "react-native-gesture-handler";
import { ClockIcon, StarIcon } from "lucide-nativewind";
import { OutlinedImage } from "~/components/ui/outlined-image";
import { Separator } from "~/components/ui/separator";
import RotationCard from "~/components/Onboarding/RotationCard";
import TopBar from "~/components/Recipe/Details/TopBar";
import RecipeServing from "~/components/Recipe/Details/RecipeServing";
import RecipeNutrition from "~/components/Recipe/Details/RecipeNutrition";
import BottomActionBar from "~/components/Recipe/Details/BottomActionBar";
import useHeaderAnimatedStyle from "~/hooks/animation/useHeaderAnimatedStyle";

const AnimatedH1 = Animated.createAnimatedComponent(H1);

export default function RecipeDetails() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const headerAnimatedStyle = useHeaderAnimatedStyle(scrollOffset, windowWidth);

  const [serving, setServing] = useState(1);

  const recipe = useMemo(
    () => (typeof recipeId === "string" ? getRecipeById(recipeId) : undefined),
    [recipeId]
  );

  const totalMinutes = useMemo(() => {
    return (recipe?.prepMinutes ?? 0) + (recipe?.cookMinutes ?? 0);
  }, [recipe]);

  const previewImages = useMemo(() => {
    const count = Math.min(recipe?.ingredients.length ?? 0);
    const images = dummyPantryItems
      .map((item) => item.image_url)
      .slice(0, count);
    return images;
  }, [recipe?.ingredients.length]);

  const opacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [0, windowWidth * 0.3, windowWidth * 0.7],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  const updateServing = (newServing: number) => {
    setServing(newServing);
  };

  if (!recipe) {
    return (
      <View className="flex-1">
        <P>Recipe not found</P>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-background">
      {/* Overlayed top action buttons */}
      <TopBar id={recipeId} scrollOffset={scrollOffset} title={recipe.title} />

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 96 }}
      >
        {/* Hero Image (extends into safe area) */}
        <Animated.View className="relative" style={[headerAnimatedStyle]}>
          <Animated.Image
            source={{ uri: recipe.imageUrl }}
            style={[
              styles.image,
              {
                height: windowWidth,
              },
            ]}
          />
          <Animated.View
            style={[opacityStyle, styles.gradient, { height: windowWidth }]}
            className="bg-background"
          />
        </Animated.View>

        <View className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8">
          {/* Title */}
          <AnimatedH1
            entering={FadeIn}
            className="font-bowlby-one py-2 text-center tracking-tighter"
          >
            {recipe.title}
          </AnimatedH1>

          {/* Meta */}
          {(totalMinutes > 0 || (recipe.difficultyStars ?? 0) > 0) && (
            <View className="flex-row items-center justify-center gap-3 my-2">
              {totalMinutes > 0 && (
                <View className="flex-row items-center gap-2">
                  <ClockIcon
                    className="text-muted-foreground"
                    size={16}
                    strokeWidth={3}
                  />
                  <P className="font-urbanist-regular text-muted-foreground">
                    {totalMinutes} min
                  </P>
                </View>
              )}
              {totalMinutes > 0 && (recipe.difficultyStars ?? 0) > 0 && (
                <P className="font-urbanist-regular text-muted-foreground font-bold">
                  •
                </P>
              )}
              {(recipe.difficultyStars ?? 0) > 0 && (
                <View className="flex-row items-center gap-1">
                  {Array.from({ length: recipe.difficultyStars ?? 0 }).map(
                    (_, i) => (
                      <StarIcon
                        key={i}
                        className="text-yellow-500"
                        size={16}
                        strokeWidth={3}
                        fill="#ffd700"
                      />
                    )
                  )}
                  <P className="font-urbanist-regular text-muted-foreground ml-1">
                    difficulty
                  </P>
                </View>
              )}
            </View>
          )}

          <RecipeServing serving={serving} setServing={updateServing} />

          {/* User's Choice badge */}
          {/* <UserChoice /> */}

          <Separator className="my-8" />

          {/* Ingredient use summary */}
          <H4 className="font-bowlby-one text-foreground/70">Ingredients</H4>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2 mt-2 -mx-6 px-12 overflow-visible"
          >
            {previewImages.map((src, index) => (
              <RotationCard
                key={`${src}-${index}`}
                index={index}
                total={previewImages.length}
                className="-ml-6"
                style={{ zIndex: index }}
                scaleEnabled={false}
              >
                <OutlinedImage source={src} size={48} />
              </RotationCard>
            ))}
          </ScrollView>

          <Separator className="my-8" />

          {/* Description */}
          {recipe.description && (
            <P className="font-urbanist-regular text-foreground/60">
              {recipe.description}
            </P>
          )}

          <Separator className="my-8" />

          <RecipeNutrition recipe={recipe} />
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <BottomActionBar recipe={recipe} serving={serving} />
    </View>
  );
}
const styles = StyleSheet.create({
  image: {
    width: "100%",
    position: "absolute",
  },
  gradient: { width: "100%" },
});
