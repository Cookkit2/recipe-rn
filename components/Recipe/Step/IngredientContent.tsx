import React, { useState, useEffect } from "react";
import { FlatList, View } from "react-native";
import type { RecipeIngredient } from "~/types/Recipe";
import { H2, P } from "../../ui/typography";
import OutlinedImage from "~/components/ui/outlined-image";
import { dummyPantryItems } from "~/data/dummy-data";
import { databaseFacade } from "~/data/database";
import type { PantryItem } from "~/types/PantryItem";

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
  const [currentIngredient, setCurrentIngredient] = useState<PantryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findIngredient = async () => {
      try {
        // First try database
        if (databaseFacade.isInitialized && ingredient.relatedIngredientId) {
          const pantryRepo = databaseFacade.pantryItems;
          const dbItem = await pantryRepo.findById(ingredient.relatedIngredientId);
          
          if (dbItem) {
            setCurrentIngredient({
              ...dbItem,
              steps_to_store: [],
              created_at: dbItem.created_at || new Date(),
              updated_at: dbItem.updated_at || new Date(),
              image_url: dbItem.image_url as any,
            });
            setIsLoading(false);
            return;
          }
        }

        // Fallback to dummy data
        const dummyItem = dummyPantryItems.find(
          (item) => item.id === ingredient.relatedIngredientId
        );
        
        setCurrentIngredient(dummyItem || null);
      } catch (error) {
        console.error('Error finding ingredient:', error);
        // Fallback to dummy data on error
        const dummyItem = dummyPantryItems.find(
          (item) => item.id === ingredient.relatedIngredientId
        );
        setCurrentIngredient(dummyItem || null);
      } finally {
        setIsLoading(false);
      }
    };

    findIngredient();
  }, [ingredient.relatedIngredientId]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-2 my-4">
        <P className="text-foreground text-sm">{ingredient.name}</P>
        <P className="text-foreground text-sm">{ingredient.quantity}</P>
        <P className="text-muted-foreground text-xs">Loading...</P>
      </View>
    );
  }

  if (!currentIngredient) {
    return (
      <View className="flex-1 items-center justify-center p-2 my-4">
        <P className="text-foreground text-sm">{ingredient.name}</P>
        <P className="text-foreground text-sm">{ingredient.quantity}</P>
        <P className="text-destructive text-xs">Ingredient data missing</P>
      </View>
    );
  }

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
