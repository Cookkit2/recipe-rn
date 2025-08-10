import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeftIcon, HeartIcon } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Button } from "~/components/ui/button";
import { H1, H3, H4, P } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { getRecipeById } from "~/data/dummy-recipes";
import { Image } from "expo-image";
import { ScrollView } from "react-native-gesture-handler";
// import { OutlinedImage } from "~/components/ui/outlined-image";
import {
  ClockIcon,
  StarIcon,
  FlameIcon,
  AppleIcon,
  DrumstickIcon,
  WheatIcon,
} from "~/lib/icons/RecipesIcon";
// import { LeafIcon } from "~/lib/icons/Leaf";
import { OutlinedImage } from "~/components/ui/outlined-image";
import { Separator } from "~/components/ui/separator";
import { SlidingNumber } from "~/components/SlidingNumber";
import { MinusIcon, PlusIcon } from "~/lib/icons/IngredientIcons";
export default function RecipeDetails() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const recipe = useMemo(
    () => (typeof recipeId === "string" ? getRecipeById(recipeId) : undefined),
    [recipeId]
  );

  const { top: pt, bottom: pb } = useSafeAreaInsets();
  const [isFav, setIsFav] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [serving, setServing] = useState(1);

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

  const readyByLabel = useMemo(() => {
    if (!recipe) return { label: "Ready by —", time: "" };
    const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
    if (total <= 0) return { label: "Ready by —", time: "" };
    const dt = new Date(Date.now() + total * 60 * 1000);
    const rel = formatRelative(total);
    const crossesMidnight = crossesNextDay(new Date(), dt);
    const dayHint = crossesMidnight ? " (tomorrow)" : "";
    return {
      label: `Ready by ${formatTime(dt)}${dayHint}`,
      time: rel,
    };
  }, [recipe]);

  if (!recipe) {
    return (
      <View className="flex-1">
        <P>Recipe not found</P>
      </View>
    );
  }

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
      <ScrollView
        className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: pb + 96 }}
      >
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

        <View className="flex-row items-center justify-center gap-4 mt-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={() => setServing(serving - 1)}
          >
            <MinusIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
          <Separator orientation="vertical" />
          <View className="flex-row gap-2">
            <SlidingNumber value={serving} />
            <H4
              className="text-foreground/80 text-center"
              style={{ paddingTop: 2 }}
            >
              servings
            </H4>
          </View>
          <Separator orientation="vertical" />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={() => setServing(serving + 1)}
          >
            <PlusIcon
              className="text-foreground"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
        </View>

        {/* User's Choice badge */}
        {/* <View className="items-center mt-3">
          <View className="flex-row items-center gap-2 opacity-90">
            <LeafIcon
              size={20}
              className="text-foreground/80"
              style={{ transform: [{ scaleX: -1 }] }}
            />
            <H4 className="text-foreground/80">User's Choice</H4>
            <LeafIcon size={20} className="text-foreground/80" />
          </View>
        </View> */}

        <Separator className="my-8" />

        {/* Ingredient use summary */}
        <H3 className="text-foreground">Ingredients</H3>
        <View className="flex-row gap-2 px-6 mt-2">
          {previewImages.map((src, index) => (
            <OutlinedImage
              key={`ing-prev-${index}`}
              source={src}
              size={48}
              strokeColor="#ffffff"
              strokeWidth={2}
              entering={FadeInDown.duration(250).delay(index * 80)}
              style={[
                styles.thumbWrapper,
                {
                  zIndex: 10 - index,
                  transform: [
                    {
                      rotate: `${stableThumbRotation(index, previewImages.length)}deg`,
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <Separator className="my-8" />

        {/* Description */}
        {recipe.description && (
          <P className="text-foreground/60">{recipe.description}</P>
        )}

        <Separator className="my-8" />

        <View className="gap-5">
          <View className="flex-row gap-4">
            <FlameIcon className="text-muted-foreground" size={28} />
            <View className="flex-1">
              <P className="text-foreground font-semibold">Calories</P>
              <P className="text-muted-foreground">
                Approx. {recipe.calories ?? 0} kcal per serving
              </P>
            </View>
          </View>
          <View className="flex-row gap-4">
            <AppleIcon className="text-muted-foreground" size={28} />
            <View className="flex-1">
              <P className="text-foreground font-semibold">Carbs</P>
              <P className="text-muted-foreground">
                Rich in carbohydrates from flour and sugar
              </P>
            </View>
          </View>
          <View className="flex-row gap-4">
            <DrumstickIcon className="text-muted-foreground" size={28} />
            <View className="flex-1">
              <P className="text-foreground font-semibold">Protein</P>
              <P className="text-muted-foreground">
                Moderate protein from eggs and nuts
              </P>
            </View>
          </View>
          <View className="flex-row gap-4">
            <WheatIcon className="text-muted-foreground" size={22} />
            <View className="flex-1">
              <P className="text-foreground font-semibold">Allergens</P>
              <P className="text-muted-foreground">
                Contains gluten, eggs, and may contain nuts
              </P>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View
        className="absolute left-0 right-0 border-t border-border bg-background"
        style={[styles.bottomBar, { paddingBottom: pb }]}
      >
        <View className="px-6 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-col">
              <View className="flex-row items-center gap-2">
                <P className="text-foreground font-semibold">
                  {readyByLabel.label}
                </P>
                <P className="text-muted-foreground">({readyByLabel.time})</P>
              </View>
              <P className="text-muted-foreground">
                {serving} {serving === 1 ? "serving" : "servings"}
              </P>
            </View>
            <Button
              size="lg"
              className="rounded-full px-6"
              onPress={() => router.push(`/recipes/${recipeId}/steps`)}
            >
              <H4 className="text-background">Cook</H4>
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

// Stable rotation helper so thumbs don't shuffle on re-render
const stableThumbRotation = (index: number, total: number): number => {
  // Simple seeded pseudo-random based on index + total for stability
  const seed = (index + 1) * 9301 + total * 49297;
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  const deg = rand * 10 - 5; // -5..5
  return parseFloat(deg.toFixed(2));
};

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
  thumbWrapper: {
    marginLeft: -24,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    // Subtle elevation & shadow
    shadowColor: "rgba(0,0,0,1)",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
    backdropFilter: "blur(8px)",
  },
});

// ----- Time formatting helper -----

const formatTime = (date: Date): string => {
  try {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    // Fallback: HH:MM
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
};

const formatRelative = (minutesFromNow: number): string => {
  if (minutesFromNow < 60) return `in ${minutesFromNow}m`;
  const hours = Math.floor(minutesFromNow / 60);
  const mins = minutesFromNow % 60;
  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
};

const crossesNextDay = (from: Date, to: Date): boolean => {
  return (
    from.getFullYear() !== to.getFullYear() ||
    from.getMonth() !== to.getMonth() ||
    from.getDate() !== to.getDate()
  );
};
