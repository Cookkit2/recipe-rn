import { View } from "react-native";
import { H4, P } from "~/components/ui/typography";
import { titleCase } from "~/utils/text-formatter";
import type { RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";

interface IngredientListProps {
  scaledIngredients: RecipeIngredient[];
  isScaled: boolean;
  servings: number;
  findMatch: (ingredient: RecipeIngredient) => PantryItem | null;
}

export default function IngredientList({
  scaledIngredients,
  isScaled,
  servings,
  findMatch,
}: IngredientListProps) {
  if (scaledIngredients.length === 0) {
    return null;
  }

  return (
    <>
      <View className="flex-row items-center justify-between">
        <H4 className="font-bowlby-one text-foreground/70">Ingredients</H4>
        {isScaled && (
          <View className="px-2 py-1 rounded-full bg-primary/10 border border-primary/30">
            <P className="text-primary font-urbanist-medium text-xs">
              Scaled to {servings} servings
            </P>
          </View>
        )}
      </View>

      <View className="mt-3 bg-card/60 rounded-xl px-4 py-3">
        {scaledIngredients.map((ingredient, idx) => {
          const isInPantry = findMatch(ingredient) !== null;

          return (
            <View
              key={idx}
              className={`flex-row items-center py-2 ${
                idx < scaledIngredients.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              <View className="flex-1 flex-row items-center gap-2">
                <View
                  className={`w-2 h-2 rounded-full ${
                    isInPantry ? "bg-green-500" : "bg-orange-400"
                  }`}
                />
                <P
                  className={`font-urbanist-regular flex-1 ${
                    isInPantry ? "text-foreground" : "text-foreground/60"
                  }`}
                >
                  {titleCase(ingredient.name)}
                </P>
              </View>
              <View className="flex-row items-center gap-1">
                <P className="font-urbanist-semibold text-foreground">{ingredient.quantity}</P>
                <P className="font-urbanist-regular text-muted-foreground">{ingredient.unit}</P>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}
