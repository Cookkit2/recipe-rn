import React from "react";
import { View } from "react-native";
import type { RecipeIngredient } from "~/types/Recipe";
import { H4, P } from "../ui/typography";

export const IngredientsContent: React.FC<{
  ingredients: RecipeIngredient[];
}> = ({ ingredients }) => {
  return (
    <View>
      {ingredients.map((ingredient, index) => (
        <View
          key={index}
          className="flex-row items-start bg-card rounded-lg p-3 mb-2 border-continuous"
        >
          <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center mr-3 mt-0.5">
            <H4 className="text-white text-xs font-bold">{index + 1}</H4>
          </View>
          <View className="flex-1">
            <H4 className="font-medium text-foreground text-sm">
              {ingredient.quantity} {ingredient.name}
            </H4>
            {ingredient.notes && (
              <P className="text-muted-foreground text-xs mt-1">
                {ingredient.notes}
              </P>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};
