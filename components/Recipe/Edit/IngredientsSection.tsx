import React from "react";
import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-uniwind";
import EditIngredientItem from "./EditIngredientItem";
import type { RecipeIngredient } from "~/types/Recipe";

type IngredientsSectionProps = {
  ingredients: RecipeIngredient[];
  onAddIngredient: () => void;
  onChangeIngredient: (index: number, updatedIngredient: RecipeIngredient) => void;
  onRemoveIngredient: (index: number) => void;
};

export function IngredientsSection({
  ingredients,
  onAddIngredient,
  onChangeIngredient,
  onRemoveIngredient,
}: IngredientsSectionProps) {
  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <H2>Ingredients</H2>
        <Button
          size="sm"
          variant="secondary"
          onPress={onAddIngredient}
          className="flex-row items-center gap-2"
        >
          <PlusIcon size={16} strokeWidth={2.5} />
          <Text>Add Ingredient</Text>
        </Button>
      </View>

      {ingredients.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <P className="text-muted-foreground text-center">
            No ingredients yet. Tap "Add Ingredient" to get started.
          </P>
        </View>
      ) : (
        <View className="gap-3">
          {ingredients.map((ingredient, index) => (
            <EditIngredientItem
              key={`ingredient-${index}-${ingredient.name}`}
              ingredient={ingredient}
              onChange={(updatedIngredient) => onChangeIngredient(index, updatedIngredient)}
              onDelete={() => onRemoveIngredient(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
