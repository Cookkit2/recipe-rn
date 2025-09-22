import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H4, P } from "~/components/ui/typography";
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
import { Image } from "expo-image";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { SystemBars } from "react-native-edge-to-edge";
import { titleCase } from "~/utils/text-formatter";
import { Card, CardContent } from "~/components/ui/card";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";

const AnimatedH1 = Animated.createAnimatedComponent(H1);
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function RecipeDetails() {
  const { bottom } = useSafeAreaInsets();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const { data: filteredPantryItems = [] } = usePantryItemsByType("all");
  const { servings } = useRecipeDetailStore();

  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: ({ contentOffset }) => {
      scrollOffset.value = contentOffset.y;
    },
  });
  const headerAnimatedStyle = useHeaderAnimatedStyle(scrollOffset, windowWidth);

  const totalMinutes = useMemo(() => {
    return (recipe?.prepMinutes ?? 0) + (recipe?.cookMinutes ?? 0);
  }, [recipe]);

  const previewImages = useMemo(() => {
    if (!recipe?.ingredients.length) return [];

    // Filter pantry items that match recipe ingredients using improved matching
    const matchingPantryItems = filteredPantryItems.filter((pantryItem) => {
      return recipe.ingredients.some((ingredient) =>
        isIngredientMatch(pantryItem.name, ingredient.name)
      );
    });

    const count = Math.min(recipe.ingredients.length, 8); // Limit to reasonable number
    const images = matchingPantryItems
      .map((item) => item.image_url)
      .filter((url) => typeof url === "string")
      .slice(0, count);
    return images as string[];
  }, [recipe?.ingredients, filteredPantryItems]);

  const opacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [0, windowWidth * 0.3, windowWidth * 0.7],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  useEffect(() => {
    // Push a new system bar style when the screen mounts
    const entry = SystemBars.pushStackEntry({
      style: "light",
    });

    // Pop it back when leaving (to restore previous settings)
    return () => SystemBars.popStackEntry(entry);
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading recipe...</P>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  // Recipe not found
  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <H1 className="text-center">Recipe not found</H1>
        <P className="mt-2 text-muted-foreground text-center">
          The recipe you're looking for doesn't exist.
        </P>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-background">
      {/* Overlayed top action buttons */}
      <TopBar id={recipeId} scrollOffset={scrollOffset} title={recipe.title} />

      {/* Content */}
      <Animated.ScrollView
        // ref={scrollRef}
        onScroll={scrollHandler}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 96 }}
      >
        {/* Hero Image (extends into safe area) */}
        <Animated.View className="relative" style={[headerAnimatedStyle]}>
          <AnimatedImage
            source={{ uri: recipe.imageUrl }}
            style={[styles.image, { height: windowWidth }]}
            transition={100}
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

          <RecipeServing />

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

          {/* Missing Ingredients */}
          <View className="mt-6 bg-muted rounded-xl px-6 py-4">
            <H4 className="font-urbanist-semibold text-destructive/60 mb-2">
              Missing Ingredients
            </H4>
            <P className="font-urbanist-regular text-muted-foreground/70 leading-6">
              {recipe.ingredients
                .filter((ingredient) => {
                  return !filteredPantryItems.some((pantryItem) =>
                    isIngredientMatch(pantryItem.name, ingredient.name)
                  );
                })
                .map(({ name }) => titleCase(name))
                .join(", ")}
            </P>
          </View>

          <Separator className="my-8" />

          {/* Description */}
          {recipe.description && (
            <P className="font-urbanist-regular text-foreground/60">
              {recipe.description}
            </P>
          )}

          {/* <Separator className="my-8" /> */}

          {/* <RecipeNutrition recipe={recipe} /> */}
        </View>
      </Animated.ScrollView>

      {/* Bottom action bar */}
      <BottomActionBar recipe={recipe} serving={servings} />
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
