import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { H4, P, Small } from "~/components/ui/typography";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import type { Recipe } from "~/types/Recipe";
import type { RecipeMatchCategory } from "~/types/RecipeMatching";
import { RECIPE_MATCH_CATEGORY_LABELS } from "~/types/RecipeMatching";
import useDebounce from "~/hooks/useDebounce";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { CheckCircleIcon, HeartIcon } from "lucide-uniwind";
import { useToggleFavorite } from "~/hooks/queries/useFavorites";

interface RecipeItemCardProps {
  recipe: Recipe;
  completionPercentage?: number;
  matchCategory?: RecipeMatchCategory;
}

function RecipeItemCard({ recipe, completionPercentage, matchCategory }: RecipeItemCardProps) {
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } = useButtonAnimation(true, 24);
  const toggleFavorite = useToggleFavorite();

  const canMake = completionPercentage === 100;
  const hasIngredients = completionPercentage !== undefined && completionPercentage > 0;

  // Determine category color
  const getCategoryColor = () => {
    switch (matchCategory) {
      case "can_make_now":
        return "text-green-400";
      case "missing_1_2":
        return "text-amber-400";
      case "missing_3_plus":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const categoryLabel = matchCategory ? RECIPE_MATCH_CATEGORY_LABELS[matchCategory] : undefined;

  return (
    <Animated.View key={recipe.id} className="p-3 flex-1" style={[animatedStyle]}>
      <Link href={`/recipes/${recipe.id}`} asChild>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Animated.View
            className="w-full relative flex items-center justify-center border-continuous aspect-square overflow-hidden"
            style={[roundedStyle]}
          >
            <Link.AppleZoom>
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.image}
                contentFit="cover"
                collapsable={false}
                accessibilityLabel={recipe.title ? `Image of ${recipe.title}` : "Recipe image"}
              />
            </Link.AppleZoom>
            {/* Completion badge */}
            {canMake && (
              <View className="absolute top-2 right-2 bg-green-500/90 rounded-full p-1.5">
                <CheckCircleIcon size={16} className="text-white" strokeWidth={2.5} />
              </View>
            )}

            {/* Favorite button */}
            {/* <Pressable
              className="absolute top-2 left-2 p-2 rounded-full bg-black/40"
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFavorite.mutate(recipe.id);
              }}
            >
              <HeartIcon
                size={18}
                className={recipe.isFavorite ? "text-red-500" : "text-white"}
                fill={recipe.isFavorite ? "currentColor" : "none"}
                strokeWidth={2.5}
              />
            </Pressable> */}

            {/* Completion percentage bar */}
            {/* {hasIngredients && !canMake && (
              <View className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                <View
                  className="h-full bg-amber-400/90"
                  style={{ width: `${completionPercentage}%` }}
                />
              </View>
            )} */}
          </Animated.View>
          <View className="mt-2">
            <H4 className="text-white/90 opacity-80 mb-[0.5] font-urbanist-regular">
              {recipe.title}
            </H4>
            {categoryLabel && (
              <Small className={`${getCategoryColor()} font-urbanist-semibold mb-1`}>
                {categoryLabel}
              </Small>
            )}
            <View className="flex-row items-center">
              <P className="text-muted-foreground font-urbanist-medium">
                {(recipe.cookMinutes ?? 0) + (recipe.prepMinutes ?? 0)} min
              </P>
              <View className="flex-1" />
              {/* {hasIngredients && (
                <P
                  className={`font-urbanist-semibold ${canMake ? "text-green-400" : "text-amber-400/80"}`}
                >
                  {completionPercentage}%
                </P>
              )} */}
            </View>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

export default React.memo(RecipeItemCard, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.recipe.isFavorite === nextProps.recipe.isFavorite &&
    prevProps.completionPercentage === nextProps.completionPercentage &&
    prevProps.matchCategory === nextProps.matchCategory
  );
});

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
