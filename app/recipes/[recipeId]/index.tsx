import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedRef,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H3, P } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { getRecipeById } from "~/data/dummy-recipes";
import { ScrollView } from "react-native-gesture-handler";
import { ClockIcon, StarIcon } from "lucide-nativewind";
import { OutlinedImage } from "~/components/ui/outlined-image";
import { Separator } from "~/components/ui/separator";
import RotationCard from "~/components/Onboarding/RotationCard";
import TopBar from "~/components/RecipeDetails/TopBar";
import RecipeServing from "~/components/RecipeDetails/RecipeServing";
import RecipeNutrition from "~/components/RecipeDetails/RecipeNutrition";
import BottomActionBar from "~/components/RecipeDetails/BottomActionBar";
import useHeaderAnimatedStyle from "~/hooks/animation/useHeaderAnimatedStyle";

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
      <TopBar id={recipeId} />

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 96 }}
      >
        {/* Hero Image (extends into safe area) */}
        <Animated.Image
          source={{ uri: recipe.imageUrl }}
          style={[
            styles.image,
            {
              height: windowWidth,
            },
            headerAnimatedStyle,
          ]}
        />

        <View className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8">
          {/* Title */}
          <Animated.View entering={FadeIn} className="mb-4">
            <H1 className="text-center">{recipe.title}</H1>
          </Animated.View>

          {/* Meta */}
          {(totalMinutes > 0 || (recipe.difficultyStars ?? 0) > 0) && (
            <View className="flex-row items-center justify-center gap-3 mb-2">
              {totalMinutes > 0 && (
                <View className="flex-row items-center gap-2">
                  <ClockIcon className="text-muted-foreground" size={16} />
                  <P className="text-muted-foreground">{totalMinutes} min</P>
                </View>
              )}
              {totalMinutes > 0 && (recipe.difficultyStars ?? 0) > 0 && (
                <P className="text-muted-foreground font-bold">•</P>
              )}
              {(recipe.difficultyStars ?? 0) > 0 && (
                <View className="flex-row items-center gap-1">
                  {Array.from({ length: recipe.difficultyStars ?? 0 }).map(
                    (_, i) => (
                      <StarIcon
                        key={i}
                        className="text-yellow-500"
                        size={16}
                        fill="#ffd700"
                      />
                    )
                  )}
                  <P className="text-muted-foreground ml-1">difficulty</P>
                </View>
              )}
            </View>
          )}

          <RecipeServing serving={serving} setServing={updateServing} />

          {/* User's Choice badge */}
          {/* <UserChoice /> */}

          <Separator className="my-8" />

          {/* Ingredient use summary */}
          <H3 className="text-foreground">Ingredients</H3>
          <View className="flex-row gap-2 px-6 mt-2">
            {previewImages.map((src, index) => (
              <RotationCard
                key={`${src}-${index}`}
                index={index}
                total={previewImages.length}
                className="-ml-6"
                style={{
                  zIndex: index,
                }}
              >
                <OutlinedImage source={src} size={48} />
              </RotationCard>
            ))}
          </View>

          <Separator className="my-8" />

          {/* Description */}
          {recipe.description && (
            <P className="text-foreground/60">{recipe.description}</P>
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
    height: "100%",
  },
});
