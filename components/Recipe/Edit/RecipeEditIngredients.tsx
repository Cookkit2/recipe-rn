import React from "react";
import { View, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-uniwind";
import EditIngredientItem from "./EditIngredientItem";
import type { Recipe, RecipeIngredient } from "~/types/Recipe";

type Props = {
  recipe: Recipe;
  onChange: (recipe: Recipe) => void;
};

export default function RecipeEditIngredients({ recipe, onChange }: Props) {
  const handleIngredientChange = (index: number, updatedIngredient: RecipeIngredient) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = updatedIngredient;
    onChange({ ...recipe, ingredients: newIngredients });
  };

  const handleAddIngredient = () => {
    const newIngredient: RecipeIngredient = {
      name: "",
      relatedIngredientId: "",
      quantity: 1,
      unit: "cup",
      notes: "",
    };
    onChange({ ...recipe, ingredients: [...recipe.ingredients, newIngredient] });
  };

  const handleRemoveIngredient = (index: number) => {
    const ingredient = recipe.ingredients[index];
    if (!ingredient) {
      return;
    }
    Alert.alert(
      "Delete Ingredient",
      `Are you sure you want to remove "${ingredient.name || "this ingredient"}" from the recipe?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
            onChange({ ...recipe, ingredients: newIngredients });
          },
        },
      ]
    );
  };

  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <H2>Ingredients</H2>
        <Button
          size="sm"
          variant="secondary"
          onPress={handleAddIngredient}
          className="flex-row items-center gap-2"
        >
          <PlusIcon size={16} strokeWidth={2.5} />
          <Text>Add Ingredient</Text>
        </Button>
      </View>

      {recipe.ingredients.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <P className="text-muted-foreground text-center">
            No ingredients yet. Tap "Add Ingredient" to get started.
          </P>
        </View>
      ) : (
        <View className="gap-3">
          {recipe.ingredients.map((ingredient, index) => (
            <EditIngredientItem
              key={`ingredient-${index}-${ingredient.name}`}
              ingredient={ingredient}
              onChange={(updatedIngredient) => handleIngredientChange(index, updatedIngredient)}
              onDelete={() => handleRemoveIngredient(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
