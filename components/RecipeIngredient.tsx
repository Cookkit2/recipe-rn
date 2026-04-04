import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { P } from "~/components/ui/typography";
import { CheckIcon } from "lucide-uniwind";
import { titleCase } from "~/utils/text-formatter";

interface RecipeIngredientProps {
  ingredient: {
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  };
  isInPantry: boolean;
  isLast?: boolean;
}

export function RecipeIngredient({ ingredient, isInPantry, isLast }: RecipeIngredientProps) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Pressable
      onPress={() => setIsChecked(!isChecked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      accessibilityLabel={`Toggle ingredient ${ingredient.name}`}
      className={`flex-row items-center py-3 ${!isLast ? "border-b border-border/40" : ""}`}
    >
      <View className="mr-3 w-6 h-6 rounded border border-border items-center justify-center bg-background">
        {isChecked && <CheckIcon size={14} className="text-primary" />}
      </View>
      <View className="flex-1 flex-row items-center gap-2">
        {!isChecked && (
          <View
            className={`w-2 h-2 rounded-full ${isInPantry ? "bg-green-500" : "bg-orange-400"}`}
          />
        )}
        <P
          className={`font-urbanist-regular flex-1 ${
            isChecked
              ? "text-muted-foreground line-through"
              : isInPantry
                ? "text-foreground"
                : "text-foreground/60"
          }`}
        >
          {titleCase(ingredient.name)}
          {ingredient.notes ? ` (${ingredient.notes})` : ""}
        </P>
      </View>
      <View className="flex-row items-center gap-1">
        <P
          className={`font-urbanist-semibold ${
            isChecked ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {ingredient.quantity}
        </P>
        <P
          className={`font-urbanist-regular ${
            isChecked ? "text-muted-foreground line-through" : "text-muted-foreground"
          }`}
        >
          {ingredient.unit}
        </P>
      </View>
    </Pressable>
  );
}
