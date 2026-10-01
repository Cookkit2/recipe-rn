import React from "react";
import { View, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-uniwind";
import EditIngredientItem from "./EditIngredientItem";
import type { RecipeIngredient } from "~/types/Recipe";

type EditIngredientsSectionProps = {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
};

export default function EditIngredientsSection({
  ingredients,
  onChange,
}: EditIngredientsSectionProps) {
  const handleIngredientChange = (index: number, updatedIngredient: RecipeIngredient) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = updatedIngredient;
    onChange(newIngredients);
  };

  const handleAddIngredient = () => {
    const newIngredient: RecipeIngredient = {
      name: "",
      relatedIngredientId: "",
      quantity: 1,
      unit: "cup",
      notes: "",
    };
    onChange([...ingredients, newIngredient]);
  };

  const handleRemoveIngredient = (index: number) => {
    const ingredient = ingredients[index];
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
            const newIngredients = ingredients.filter((_, i) => i !== index);
            onChange(newIngredients);
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
              onChange={(updatedIngredient) => handleIngredientChange(index, updatedIngredient)}
              onDelete={() => handleRemoveIngredient(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
