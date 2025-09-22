import React, { useMemo } from "react";
import {
  FlatList,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import type { RecipeIngredient } from "~/types/Recipe";
import { H2, P } from "~/components/ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import { LinearGradient } from "expo-linear-gradient";
import useColors from "~/hooks/useColor";
import { titleCase } from "~/utils/text-formatter";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import { useRouter } from "expo-router";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import Animated from "react-native-reanimated";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";

export const IngredientsContent: React.FC<{
  ingredients: RecipeIngredient[];
  totalSteps: number;
}> = ({ ingredients }) => {
  const colors = useColors();

  return (
    <View className="flex-1 h-full rounded-3xl border-continuous p-4 overflow-hidden">
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
        <FlatList
          numColumns={3}
          className="flex-1 w-full max-w-sm"
          contentContainerClassName="pt-2 pb-6"
          showsVerticalScrollIndicator={false}
          data={ingredients}
          scrollEnabled={false}
          keyExtractor={(item) => item.name}
          renderItem={({ item, index }) => (
            <IngredientItem
              key={item.relatedIngredientId}
              ingredient={item}
              index={index}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-3" />}
        />
      </ScrollView>
    </View>
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IngredientItem: React.FC<{
  ingredient: RecipeIngredient;
  index: number;
}> = ({ ingredient, index }) => {
  const { servings } = useRecipeDetailStore();
  const colors = useColors();
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  const { data: filteredPantryItems = [] } = usePantryItemsByType("all");

  const currentIngredient = useMemo(() => {
    // Find pantry item that matches this ingredient by name (same logic as index page)
    return filteredPantryItems.find((pantryItem) =>
      isIngredientMatch(pantryItem.name, ingredient.name)
    );
  }, [filteredPantryItems, ingredient.name]);

  const previewImage = currentIngredient?.image_url;

  return (
    <AnimatedPressable
      onPress={() => router.push(`/ingredient/${currentIngredient?.id}`)}
      className="flex-1 mb-3 px-1"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      {previewImage ? (
        <View className="relative items-center justify-center">
          <OutlinedImage source={previewImage} size={56} strokeWidth={2.618} />
        </View>
      ) : (
        <View className="w-16 h-16 items-center justify-center self-center">
          <ShapeContainer
            index={index}
            width={64}
            height={64}
            text="?"
            textClassname="text-3xl text-foreground/70 leading-[2]"
            color={colors.border}
          />
        </View>
      )}
      <P
        className="text-foreground/80 text-sm font-urbanist-semibold text-center leading-tight mt-2"
        numberOfLines={2}
      >
        {titleCase(ingredient.name)}
      </P>

      <P className="text-foreground text-xs tracking-wider font-urbanist-bold text-center mt-0.5">
        {ingredient.quantity * servings} {ingredient.unit}
      </P>
    </AnimatedPressable>
  );
};
