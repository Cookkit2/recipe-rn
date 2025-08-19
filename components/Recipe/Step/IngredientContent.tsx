import React from "react";
import { FlatList, View, StyleSheet, ScrollView } from "react-native";
import type { RecipeIngredient } from "~/types/Recipe";
import { H2, P } from "../../ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import { dummyPantryItems } from "~/data/dummy-data";
import { LinearGradient } from "expo-linear-gradient";
import useColors from "~/hooks/useColor";
import { sentenceCase, titleCase } from "~/utils/text-formatter";
import ShapeContainer from "~/components/Shared/Shapes/ShapeContainer";

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
          contentContainerClassName="px-2 pb-4"
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

const IngredientItem: React.FC<{
  ingredient: RecipeIngredient;
  index: number;
}> = ({ ingredient, index }) => {
  const colors = useColors();

  const currentIngredient = dummyPantryItems.find(
    (item) => item.id === ingredient.relatedIngredientId
  );

  return (
    <View className="flex-1 mb-3 px-1">
      {!currentIngredient ? (
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
      ) : (
        <View className="relative items-center justify-center">
          <OutlinedImage
            source={currentIngredient?.image_url}
            size={56}
            strokeWidth={2.618}
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
        {sentenceCase(ingredient.quantity)}
      </P>
    </View>
  );
};
