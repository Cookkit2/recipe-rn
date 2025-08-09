import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import type { Recipe } from "~/data/dummy-recipes";
import { ArrowLeftIcon } from "~/lib/icons/Back";
import { HeartIcon } from "~/lib/icons/RecipesIcon";
import { dummyPantryItems } from "~/data/dummy-data";

interface RecipeViewProps {
  scrollComponent?: (
    props: React.ComponentProps<typeof ScrollView>
  ) => React.ReactElement;
  recipe: Recipe;
}

export default function RecipeView({
  scrollComponent,
  recipe,
}: RecipeViewProps) {
  const ScrollComponentToUse = scrollComponent || ScrollView;
  const { top: pt } = useSafeAreaInsets();
  const [isFav, setIsFav] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [thumbsLoaded, setThumbsLoaded] = useState(0);

  const metaItems = useMemo(() => {
    const items: string[] = [];
    const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
    if (total > 0) items.push(`${total} min`);
    if (typeof recipe.difficultyStars === "number")
      items.push(`${recipe.difficultyStars} star difficulty`);
    return items;
  }, [recipe.prepMinutes, recipe.cookMinutes, recipe.difficultyStars]);

  const previewImages = useMemo(() => {
    const count = Math.min(recipe.ingredients.length, 4);
    const images = dummyPantryItems
      .map((item) => item.image_url)
      .slice(0, count);
    return images;
  }, [recipe.ingredients.length]);

  // Stable random rotation per recipe for each preview card
  const thumbRotationByIndex = useMemo(() => {
    return previewImages.map(() => {
      const deg = Math.random() * 10 - 5; // -5deg .. 5deg
      return parseFloat(deg.toFixed(2));
    });
  }, [previewImages]);

  return (
    <View className="flex-1 h-full w-full rounded-t-3xl overflow-hidden bg-background">
      {/* Hero Image (extends into safe area) */}
      <Animated.View>
        <AspectRatio
          className="relative w-full bg-muted flex items-center justify-center rounded-b-2xl"
          ratio={1}
        >
          <Image
            source={{ uri: recipe.imageUrl }}
            contentFit="cover"
            style={styles.image}
            onLoadEnd={() => setHeroLoaded(true)}
          />
          {/* Hero skeleton overlay */}
          {!heroLoaded && (
            <View className="absolute inset-0 bg-muted animate-pulse" />
          )}

          {/* Overlayed top action buttons */}
          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-6"
            style={{ top: pt + 8 }}
            pointerEvents="box-none"
          >
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onPress={() => router.back()}
            >
              <ArrowLeftIcon className="text-foreground" size={20} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onPress={() => setIsFav((v) => !v)}
            >
              <HeartIcon
                className={isFav ? "text-red-500" : "text-foreground"}
                size={20}
              />
            </Button>
          </View>
        </AspectRatio>
      </Animated.View>

      {/* Content */}
      <ScrollComponentToUse
        className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.Text
          entering={FadeIn}
          className="web:scroll-m-20 text-4xl text-foreground font-extrabold tracking-tight lg:text-5xl web:select-text mb-2 text-center"
        >
          {recipe.title}
        </Animated.Text>

        {/* Meta */}
        {metaItems.length > 0 && (
          <View className="flex-row flex-wrap items-center justify-center gap-2 mb-4">
            {metaItems.map((label, idx) => (
              <View key={idx} className="flex-row items-center">
                <P className="text-muted-foreground">{label}</P>
                {idx < metaItems.length - 1 && (
                  <P className="text-muted-foreground"> • </P>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-2 mb-6">
            {recipe.tags.map((tag) => (
              <View
                key={tag}
                className="px-3 py-1 rounded-full bg-muted border border-border"
              >
                <P className="text-foreground text-xs">{tag}</P>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {recipe.description && (
          <P className="text-center mb-6 text-foreground/80">
            {recipe.description}
          </P>
        )}

        {/* Ingredient use summary */}
        <View className="flex-row items-center justify-between mb-6">
          <P className="text-foreground">
            {recipe.ingredients.length} ingredients
          </P>
          <View style={styles.ingredientThumbsContainer}>
            {/* Skeleton thumbnails while loading */}
            {thumbsLoaded < previewImages.length && (
              <>
                {previewImages.map((_, index) => (
                  <View
                    key={`ing-skel-${index}`}
                    style={[
                      styles.thumbWrapper,
                      {
                        left: index * 22,
                        zIndex: 10 - index,
                        transform: [
                          { rotate: `${thumbRotationByIndex[index] ?? 0}deg` },
                        ],
                      },
                    ]}
                    className="border-white animate-pulse"
                  />
                ))}
              </>
            )}

            {previewImages.map((src, index) => (
              <Animated.View
                key={`ing-prev-${index}`}
                style={[
                  styles.thumbWrapper,
                  {
                    left: index * 22,
                    zIndex: 10 - index,
                    transform: [
                      { rotate: `${thumbRotationByIndex[index] ?? 0}deg` },
                    ],
                  },
                ]}
                className="shadow border-white"
                entering={FadeInDown.duration(250).delay(index * 80)}
              >
                <Image
                  source={src}
                  style={styles.thumb}
                  contentFit="cover"
                  onLoadEnd={() => setThumbsLoaded((c) => c + 1)}
                />
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollComponentToUse>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
  ingredientThumbsContainer: {
    height: 48,
    width: 120,
  },
  thumbWrapper: {
    position: "absolute",
    top: 0,
    height: 48,
    width: 48,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.15)",
    shadowColor: "rgba(0,0,0,1)",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
});
