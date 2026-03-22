import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { H1, H4, P, Small } from "~/components/ui/typography";
import { ClockIcon, StarIcon, ShoppingCartIcon } from "lucide-uniwind";
import { OutlinedImage } from "~/components/ui/outlined-image";
import { Separator } from "~/components/ui/separator";
import RotationCard from "~/components/Shared/RotationCard";
import TopBar from "~/components/Recipe/Details/TopBar";
import RecipeServing from "~/components/Recipe/Details/RecipeServing";
import BottomActionBar from "~/components/Recipe/Details/BottomActionBar";
import { Image } from "expo-image";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { useAddToMealPlan, useIsRecipeInPlan } from "~/hooks/queries/useMealPlanQueries";
import { titleCase } from "~/utils/text-formatter";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { setStatusBarStyle } from "expo-status-bar";
import { recipeApi } from "~/data/api/recipeApi";
import type { Recipe } from "~/types/Recipe";
import { RecipeIngredient } from "~/components/RecipeIngredient";
import { RecipeStep } from "~/components/RecipeStep";
import { useUniwind } from "uniwind";
import { Button } from "~/components/ui/button";
import { useIngredientMatcher } from "~/hooks/useIngredientMatcher";
import { isIngredientMatch } from "~/utils/ingredient-matching";

const AnimatedH1 = Animated.createAnimatedComponent(H1);
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function RecipeDetails() {
  const { theme } = useUniwind();
  const isDark = theme === "dark";
  const missingIngredientPalette = isDark
    ? ["#9CA3AF", "#D1D5DB", "#A1A1AA", "#E5E7EB", "#CBD5E1", "#94A3B8"]
    : ["#4B5563", "#6B7280", "#9CA3AF", "#374151", "#525966", "#78818F"];

  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const { data: recipe, isLoading, error, refetch, isRefetching } = useRecipe(recipeId);
  const { data: filteredPantryItems = [] } = usePantryItemsByType("all");
  const { servings, scaledIngredients, scalingFactor, isScaled, originalServings } =
    useRecipeDetailStore();
  const [tailoredRecipe, setTailoredRecipe] = useState<Recipe | null>(null);
  const [mode, setMode] = useState<"original" | "tailored">("original");
  const [isTailoring, setIsTailoring] = useState(false);
  const { data: isInPlan } = useIsRecipeInPlan(recipeId);
  const addToMealPlan = useAddToMealPlan();

  // Use optimized ingredient matching hook
  const { findMatch, countMatchingPantryItems, getMissingIngredients } = useIngredientMatcher({
    pantryItems: filteredPantryItems,
  });

  const scrollRef = useAnimatedRef<ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);

  // We manually calculate the parallax style here instead of using strict useHeaderAnimatedStyle
  // because we are moving the image OUTSIDE the ScrollView to prevent scroll-jitter/shaking.
  // The logic is derived from: y_out = y_in - scrollOffset
  const parallaxHeaderStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-windowWidth, 0, windowWidth],
            [windowWidth * 0.5, 0, -windowWidth * 0.25],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-windowWidth, 0, windowWidth],
            [2, 1, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const activeRecipe = useMemo(() => {
    if (!recipe) return null;
    return mode === "tailored" && tailoredRecipe ? tailoredRecipe : recipe;
  }, [mode, tailoredRecipe, recipe]);

  const totalMinutes = useMemo(() => {
    return (activeRecipe?.prepMinutes ?? 0) + (activeRecipe?.cookMinutes ?? 0);
  }, [activeRecipe]);

  // Separate matched and missing ingredients for visual display
  // Use scaled ingredients to display the correct quantities
  const ingredientPreviewData = useMemo(() => {
    if (!scaledIngredients.length || !activeRecipe?.ingredients) {
      return { matched: [], missing: [] };
    }

    const matched: { name: string; imageUrl: string; quantity: number; unit: string }[] = [];
    const missing: { name: string; index: number; quantity: number; unit: string }[] = [];

    activeRecipe.ingredients.forEach((ingredient, idx) => {
      const matchingPantryItem = findMatch(ingredient);

      if (matchingPantryItem?.image_url) {
        matched.push({
          name: ingredient.name,
          imageUrl: matchingPantryItem.image_url as string,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        });
      } else {
        missing.push({
          name: ingredient.name,
          index: idx,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        });
      }
    });

    // Limit total items for performance
    return {
      matched: matched.slice(0, 6),
      missing: missing.slice(0, 6),
    };
  }, [activeRecipe?.ingredients, findMatch]);

  const canTailor = useMemo(() => {
    if (!recipe?.ingredients?.length) return false;
    if (!filteredPantryItems.length) return false;
    const matchingCount = countMatchingPantryItems(recipe.ingredients);
    const completionPercentage = (matchingCount / recipe.ingredients.length) * 100;
    return completionPercentage >= 50;
  }, [recipe?.ingredients, countMatchingPantryItems]);

  const opacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollOffset.value,
      [0, windowWidth * 0.3, windowWidth * 0.7],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  const memoizedMissingIngredients = useMemo(() => {
    const ingredients = activeRecipe?.ingredients ?? [];
    return getMissingIngredients(ingredients)
      .map(({ name }) => titleCase(name))
      .join(", ");
  }, [activeRecipe?.ingredients, getMissingIngredients]);

  const contentOpacity = useSharedValue(1);
  const contentScale = useSharedValue(1);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  const animateContentSwap = useCallback(() => {
    contentOpacity.value = 0;
    contentScale.value = 0.98;
    contentOpacity.value = withTiming(1, { duration: 220 });
    contentScale.value = withTiming(1, { duration: 220 });
  }, [contentOpacity, contentScale]);

  const handleTailorRecipe = useCallback(async () => {
    if (!recipe || isTailoring) return;

    if (!filteredPantryItems.length || !canTailor) {
      Alert.alert(
        "Not enough ingredients",
        "You need at least 50% matching ingredients to tailor this recipe."
      );
      return;
    }

    setIsTailoring(true);
    try {
      const tailored = await recipeApi.generateTailoredRecipe(recipe, filteredPantryItems);
      setTailoredRecipe(tailored);
      setMode("tailored");
      animateContentSwap();
    } catch {
      Alert.alert(
        "Tailoring failed",
        "We couldn't tailor this recipe right now. Please try again."
      );
    } finally {
      setIsTailoring(false);
    }
  }, [recipe, filteredPantryItems, isTailoring, animateContentSwap, canTailor]);

  const handleToggleMode = useCallback(() => {
    if (!tailoredRecipe) return;
    setMode((prev) => (prev === "tailored" ? "original" : "tailored"));
    animateContentSwap();
  }, [tailoredRecipe, animateContentSwap]);

  const handleAddMissingToGrocery = useCallback(() => {
    if (!recipe) return;

    const servingsToAdd = activeRecipe?.servings ?? recipe.servings ?? 2;
    addToMealPlan.mutate(
      { recipeId, servings: servingsToAdd },
      {
        onSuccess: () => {
          Alert.alert(
            "Added to grocery list",
            "Missing ingredients have been added to your grocery list."
          );
        },
        onError: () => {
          Alert.alert("Error", "Failed to add ingredients to grocery list. Please try again.");
        },
      }
    );
  }, [recipe, recipeId, activeRecipe, addToMealPlan]);

  useEffect(() => {
    if (!recipe) return;
    setTailoredRecipe(null);
    setMode("original");
  }, [recipe?.id]);

  useEffect(() => {
    setStatusBarStyle("light", true);

    return () => setStatusBarStyle("auto", true);
  }, []);

  const readyByLabel = useMemo(() => {
    if (!activeRecipe) return { label: "Ready by —", time: "" };
    const total = (activeRecipe.prepMinutes ?? 0) + (activeRecipe.cookMinutes ?? 0);
    if (total <= 0) return { label: "Ready by —", time: "" };
    const dt = new Date(Date.now() + total * 60 * 1000);
    const rel = formatRelative(total);
    const crossesMidnight = crossesNextDay(new Date(), dt);
    const dayHint = crossesMidnight ? " (tomorrow)" : "";
    return {
      label: `Ready by ${formatTime(dt)}${dayHint}`,
      time: rel,
    };
  }, [activeRecipe]);

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
        <P className="text-destructive text-center mb-4">{error.message}</P>
        <Button onPress={() => refetch()}>
          <P className="text-primary-foreground font-urbanist-semibold">Retry</P>
        </Button>
      </View>
    );
  }

  // Recipe not found
  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <H1 className="text-center">Recipe not found</H1>
        <P className="mt-2 mb-4 text-muted-foreground text-center">
          The recipe you're looking for doesn't exist.
        </P>
        <Button onPress={() => refetch()}>
          <P className="text-primary-foreground font-urbanist-semibold">Retry</P>
        </Button>
      </View>
    );
  }

  const displayedRecipe = activeRecipe ?? recipe;

  return (
    <View className="relative flex-1 bg-background">
      {/* Background Parallax Header */}
      <Animated.View
        className="absolute top-0 left-0 right-0 bg-background"
        style={[parallaxHeaderStyle, { height: windowWidth, zIndex: 0 }]}
      >
        <AnimatedImage
          source={{ uri: displayedRecipe.imageUrl }}
          style={[styles.image, { height: windowWidth }]}
          transition={100}
        />
        <Animated.View
          style={[opacityStyle, styles.gradient, { height: windowWidth }]}
          className="bg-background"
        />
      </Animated.View>

      {/* Content */}
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: windowWidth }}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />
        }
      >
        <Animated.View
          className="flex-1 px-6 py-8 bg-background rounded-t-3xl -mt-8"
          style={contentAnimatedStyle}
        >
          {/* Title */}
          <AnimatedH1
            entering={FadeIn}
            className="font-bowlby-one py-2 text-center tracking-tighter"
          >
            {displayedRecipe.title}
          </AnimatedH1>

          {mode === "tailored" && (
            <View className="items-center mb-2">
              <View className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                <P className="text-primary font-urbanist-semibold">Tailored</P>
              </View>
            </View>
          )}

          {/* Meta */}
          {(totalMinutes > 0 || (recipe.difficultyStars ?? 0) > 0) && (
            <View className="flex-column items-center justify-center gap-3 my-2">
              {totalMinutes > 0 && (
                <View className="flex-row items-center gap-2">
                  <ClockIcon className="text-muted-foreground" size={16} strokeWidth={3} />
                  <P className="font-urbanist-medium text-foreground">{readyByLabel.label}</P>
                  <P className="font-urbanist-regular text-muted-foreground font-bold">•</P>
                  <P className="font-urbanist-regular text-muted-foreground">{totalMinutes} min</P>
                </View>
              )}
              {(displayedRecipe.difficultyStars ?? 0) > 0 && (
                <View className="flex-row items-center gap-1">
                  {Array.from({ length: displayedRecipe.difficultyStars ?? 0 }).map((_, i) => (
                    <StarIcon
                      key={i}
                      className="text-yellow-500"
                      size={16}
                      strokeWidth={3}
                      fill="#ffd700"
                    />
                  ))}
                  <P className="font-urbanist-regular text-muted-foreground ml-1">difficulty</P>
                </View>
              )}
            </View>
          )}

          <RecipeServing />

          {/* User's Choice badge */}
          {/* <UserChoice /> */}

          <Separator className="my-8" />

          {/* Ingredient use summary */}
          <View className="flex-row items-center justify-between">
            <H4 className="font-bowlby-one text-foreground/70">Ingredients</H4>
            {isScaled && (
              <View className="px-2 py-1 rounded-full bg-primary/10 border border-primary/30">
                <P className="text-primary font-urbanist-medium text-xs">
                  Scaled to {servings} servings
                </P>
              </View>
            )}
          </View>

          {/* Ingredient list with scaled quantities */}
          {scaledIngredients.length > 0 && (
            <View className="mt-3 bg-card/60 rounded-xl px-4 py-3">
              {scaledIngredients.map((ingredient, idx) => {
                const isInPantry = filteredPantryItems.some((pantryItem) =>
                  isIngredientMatch(
                    pantryItem.name,
                    ingredient.name,
                    pantryItem.synonyms?.map((s) => s.synonym)
                  )
                );

                return (
                  <RecipeIngredient
                    key={idx}
                    ingredient={ingredient}
                    isInPantry={isInPantry}
                    isLast={idx === scaledIngredients.length - 1}
                  />
                );
              })}
            </View>
          )}

          {/* Ingredient visual preview (keep existing rotation cards) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2 mt-2 -mx-6 px-12 overflow-visible"
          >
            {/* Matched ingredients with images */}
            {ingredientPreviewData.matched.map((item, index) => (
              <RotationCard
                key={`matched-${item.name}-${index}`}
                index={index}
                total={ingredientPreviewData.matched.length + ingredientPreviewData.missing.length}
                className="-ml-6"
                style={{ zIndex: index }}
                scaleEnabled={false}
              >
                <OutlinedImage source={item.imageUrl} size={48} />
              </RotationCard>
            ))}
            {/* Missing ingredients with shape placeholders */}
            {ingredientPreviewData.missing.map((item, index) => (
              <RotationCard
                key={`missing-${item.name}-${index}`}
                index={ingredientPreviewData.matched.length + index}
                total={ingredientPreviewData.matched.length + ingredientPreviewData.missing.length}
                className="-ml-6"
                style={{ zIndex: ingredientPreviewData.matched.length + index }}
                scaleEnabled={false}
              >
                <ShapeContainer
                  index={item.index % 21}
                  text="?"
                  width={48}
                  height={48}
                  color={missingIngredientPalette[index % 6]}
                />
              </RotationCard>
            ))}
          </ScrollView>

          {/* Missing Ingredients */}
          {memoizedMissingIngredients && (
            <View className="mt-6 bg-card/80 rounded-xl px-6 py-4">
              <View className="flex-row items-center justify-between">
                <H4 className="font-urbanist-semibold text-destructive/60 mb-2">
                  Missing Ingredients
                </H4>
                {/* Add missing ingredients to grocery list button */}
                {!isInPlan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={handleAddMissingToGrocery}
                    disabled={addToMealPlan.isPending}
                  >
                    <Small className="font-urbanist-semibold text-foreground/50">
                      {addToMealPlan.isPending ? "Adding..." : "Add to Grocery"}
                    </Small>
                  </Button>
                )}
              </View>
              <P className="font-urbanist-regular text-muted-foreground/70 leading-6">
                {memoizedMissingIngredients}
              </P>
            </View>
          )}

          <Separator className="my-8" />

          <Separator className="my-8" />

          {/* Instructions */}
          {displayedRecipe.instructions && displayedRecipe.instructions.length > 0 && (
            <View>
              <H4 className="font-bowlby-one text-foreground/70 mb-4">Instructions</H4>
              <View className="bg-card/60 rounded-xl px-4 py-2">
                {displayedRecipe.instructions.map((step, idx) => (
                  <RecipeStep
                    key={idx}
                    step={step}
                    isLast={idx === displayedRecipe.instructions.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          <Separator className="my-8" />
          {/* Description */}
          {displayedRecipe.description && (
            <P className="font-urbanist-regular text-foreground/60">
              {displayedRecipe.description}
            </P>
          )}

          {/* <Separator className="my-8" /> */}

          {/* <RecipeNutrition recipe={recipe} /> */}

          <View className="h-32" />
        </Animated.View>
      </Animated.ScrollView>

      {/* Overlayed title bar - Rendered last to ensure z-index on top */}
      <TopBar scrollOffset={scrollOffset} title={displayedRecipe.title} />

      {/* Bottom action bar */}
      <BottomActionBar
        recipe={displayedRecipe}
        baseRecipeId={recipe.id}
        tailoredRecipeId={tailoredRecipe?.id}
        mode={mode}
        hasTailored={!!tailoredRecipe}
        canTailor={canTailor}
        isTailoring={isTailoring}
        onTailor={handleTailorRecipe}
        onToggleMode={handleToggleMode}
      />
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
