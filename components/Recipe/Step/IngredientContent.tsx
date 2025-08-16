import React from "react";
import { FlatList, View } from "react-native";
import type { RecipeIngredient } from "~/types/Recipe";
import { H1, H2, H4, P } from "../../ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import { dummyPantryItems } from "~/data/dummy-data";

export const IngredientsContent: React.FC<{
  ingredients: RecipeIngredient[];
}> = ({ ingredients }) => {
  return (
    <View>
      <H2 className="text-center text-foreground py-4">Ingredients</H2>
      <FlatList
        numColumns={3}
        className="flex-1 h-full w-full"
        contentContainerClassName="flex-1 h-full w-full"
        showsVerticalScrollIndicator={false}
        data={ingredients}
        scrollEnabled={false}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <IngredientItem ingredient={item} />}
      />
    </View>
  );
};

const IngredientItem: React.FC<{
  ingredient: RecipeIngredient;
}> = ({ ingredient }) => {
  const currentIngredient = dummyPantryItems.find(
    (item) => item.id === ingredient.relatedIngredientId
  );

  if (!currentIngredient) return null;

  return (
    <View className="flex-1 items-center justify-center p-2 my-4">
      <OutlinedImage
        source={currentIngredient?.image_url}
        size={64}
        strokeWidth={2.618}
      />
      <P className="text-foreground text-sm">{ingredient.name}</P>
      <P className="text-foreground text-sm">{ingredient.quantity}</P>
    </View>
  );
};
