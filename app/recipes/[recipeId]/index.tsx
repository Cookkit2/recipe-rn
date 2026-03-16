import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
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
import { ShoppingCartIcon } from "lucide-uniwind";
import { Separator } from "~/components/ui/separator";
import TopBar from "~/components/Recipe/Details/TopBar";
import RecipeServing from "~/components/Recipe/Details/RecipeServing";
import RecipeMeta from "~/components/Recipe/Details/RecipeMeta";
import IngredientList from "~/components/Recipe/Details/IngredientList";
import IngredientVisualPreview from "~/components/Recipe/Details/IngredientVisualPreview";
import MissingIngredients from "~/components/Recipe/Details/MissingIngredients";

import BottomActionBar from "~/components/Recipe/Details/BottomActionBar";
import { Image } from "expo-image";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { useAddToMealPlan, useIsRecipeInPlan } from "~/hooks/queries/useMealPlanQueries";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";
import { setStatusBarStyle } from "expo-status-bar";
import { recipeApi } from "~/data/api/recipeApi";
import type { Recipe } from "~/types/Recipe";
import { useUniwind } from "uniwind";
import { Button } from "~/components/ui/button";
import { useIngredientMatcher } from "~/hooks/useIngredientMatcher";
import { titleCase } from "~/utils/text-formatter";

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
  const { data: recipe, isLoading, error } = useRecipe(recipeId);
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
          <RecipeMeta
            totalMinutes={totalMinutes}
            readyByLabel={readyByLabel}
            difficultyStars={displayedRecipe.difficultyStars ?? 0}
          />

          <RecipeServing />

          {/* User's Choice badge */}
          {/* <UserChoice /> */}

          <Separator className="my-8" />

          {/* Ingredient use summary */}
          <IngredientList
            scaledIngredients={scaledIngredients}
            isScaled={isScaled}
            servings={servings}
            findMatch={findMatch}
          />

          {/* Ingredient visual preview */}
          <IngredientVisualPreview
            ingredientPreviewData={ingredientPreviewData}
            missingIngredientPalette={missingIngredientPalette}
          />

          {/* Missing Ingredients */}
          <MissingIngredients
            memoizedMissingIngredients={memoizedMissingIngredients}
            isInPlan={!!isInPlan}
            isAddingToPlan={addToMealPlan.isPending}
            onAddToPlan={handleAddMissingToGrocery}
          />

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
