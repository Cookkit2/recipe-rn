import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import type { RecipeIngredient } from "~/types/Recipe";
import { H2, P } from "~/components/ui/typography";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import OutlinedImage from "~/components/ui/outlined-image";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2Icon, ArrowRightIcon } from "lucide-uniwind";
import useColors from "~/hooks/useColor";
import { titleCase } from "~/utils/text-formatter";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { useIngredientMatcher } from "~/hooks/useIngredientMatcher";
import type { PantryItem } from "~/types/PantryItem";
import { useRouter } from "expo-router";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import Animated from "react-native-reanimated";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { useRecipeSteps } from "~/store/RecipeStepsContext";

export const IngredientsContent: React.FC<{
  ingredients: RecipeIngredient[];
  totalSteps: number;
}> = ({ ingredients }) => {
  const colors = useColors();
  const { data: filteredPantryItems = [] } = usePantryItemsByType("all");
  const { usedIngredientIds, toggleIngredient, allIngredientsUsed, goToNextStep } =
    useRecipeSteps();
  const { servings } = useRecipeDetailStore();

  // Optimization: Move O(N) pantry item matching to the parent component
  // using the O(1) indexed `useIngredientMatcher` rather than doing it
  // inside each child component, preventing unnecessary closure/lookup overhead
  const { findMatch } = useIngredientMatcher({ pantryItems: filteredPantryItems });

  return (
    <View
      className="flex-1 h-full rounded-3xl border-continuous p-4 overflow-hidden"
      shouldRasterizeIOS={true}
      renderToHardwareTextureAndroid={true}
    >
      <LinearGradient
        colors={[colors.foreground, colors.mutedForeground]}
        style={[StyleSheet.absoluteFill]}
        start={[0.1, 0.3]}
        end={[0.9, 0.77]}
      />
      <ScrollView
        className="flex-1 px-4 pt-12 bg-background rounded-2xl border-continuous"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="justify-center items-center"
      >
        <H2 className="text-center text-foreground font-bowlby-one tracking-wide my-3">
          Ingredients
        </H2>
        {/* ⚡ Bolt Optimization:
            Replaced unscrollable FlatList with mapped View to eliminate virtualization
            overhead. This reduces memory allocations and speeds up initial render
            for static grids by avoiding VirtualizedList logic entirely. */}
        <View className="flex-1 w-full max-w-sm pt-2 pb-6 flex-row flex-wrap justify-start">
          {ingredients.map((item, index) => (
            <View key={item.relatedIngredientId} className="w-1/3 mb-3">
              <IngredientItem
                ingredient={item}
                index={index}
                matchedPantryItem={findMatch(item)}
                isUsed={usedIngredientIds.has(item.relatedIngredientId)}
                onToggle={() => toggleIngredient(item.relatedIngredientId)}
              />
            </View>
          ))}
        </View>
        {allIngredientsUsed && (
          <Button
            size="lg"
            onPress={() => goToNextStep(servings)}
            className="mt-2 mb-6 bg-foreground/80"
            containerClassName="w-full max-w-sm"
            accessibilityLabel="Start cooking"
            accessibilityHint="Advances to the first cooking step"
          >
            <Text>Start cooking</Text>
            <ArrowRightIcon className="text-background ml-2" size={18} strokeWidth={2.5} />
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IngredientItem: React.FC<{
  ingredient: RecipeIngredient;
  index: number;
  matchedPantryItem: PantryItem | null | undefined;
  isUsed: boolean;
  onToggle: () => void;
}> = ({ ingredient, index, matchedPantryItem, isUsed, onToggle }) => {
  const { servings } = useRecipeDetailStore();
  const colors = useColors();
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();

  const previewImage = matchedPantryItem?.image_url;
  const pantryItemId = matchedPantryItem?.id;

  return (
    <AnimatedPressable
      // Tap toggles the ingredient's "used" state (cook-session tick-off);
      // long-press still reaches the pantry-detail deep-link so that flow is
      // not lost.
      onPress={onToggle}
      onLongPress={pantryItemId ? () => router.push(`/ingredient/${pantryItemId}`) : undefined}
      delayLongPress={400}
      className="flex-1 mb-3 px-1"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      accessibilityRole="button"
      accessibilityState={{ selected: isUsed }}
      accessibilityLabel={`${titleCase(ingredient.name)}. Quantity: ${
        ingredient.quantity * servings
      } ${ingredient.unit}. ${
        isUsed ? "Marked as used" : "Tap to mark as used"
      }${pantryItemId ? ". Long-press for pantry details." : ""}`}
    >
      {previewImage ? (
        <View className="relative items-center justify-center">
          <OutlinedImage source={previewImage} size={56} strokeWidth={2.618} />
          {isUsed && (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <CheckCircle2Icon
                size={56}
                strokeWidth={2.5}
                className="text-foreground"
                fill={colors.background}
              />
            </View>
          )}
        </View>
      ) : (
        <View className="w-16 h-16 items-center justify-center self-center">
          <ShapeContainer
            index={index}
            width={64}
            height={64}
            text={isUsed ? "✓" : "?"}
            textClassname="text-3xl text-foreground/70 leading-[2]"
            color={colors.border}
          />
        </View>
      )}
      <P
        className={`text-foreground/80 text-sm font-urbanist-semibold text-center leading-tight mt-2 ${
          isUsed ? "line-through opacity-50" : ""
        }`}
        numberOfLines={2}
      >
        {titleCase(ingredient.name)}
      </P>

      <P
        className={`text-foreground text-xs tracking-wider font-urbanist-bold text-center mt-0.5 ${
          isUsed ? "line-through opacity-50" : ""
        }`}
      >
        {ingredient.quantity * servings} {ingredient.unit}
      </P>
    </AnimatedPressable>
  );
};
