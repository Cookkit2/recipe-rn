import React from "react";
import { View } from "react-native";
import { Muted, P } from "~/components/ui/typography";
import { PREF_ALLERGENS_KEY } from "~/constants/storage-keys";
import useLocalStorageState from "~/hooks/useLocalStorageState";
import type { Allergen } from "~/types/Allergen";
import type { Recipe } from "~/types/Recipe";

interface MacroItem {
  label: string;
  value: number | undefined;
  unit: string;
}

function formatMacro(value: number | undefined): string {
  if (value == null) return "—";
  return String(Math.round(value));
}

export default function RecipeNutrition({ recipe }: { recipe: Recipe }) {
  const [userAllergens = []] = useLocalStorageState<Allergen[]>(PREF_ALLERGENS_KEY, {
    defaultValue: [],
    serializer: {
      parse: (value: string) => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed as Allergen[];
          return [];
        } catch {
          return [];
        }
      },
      stringify: (value: unknown) => JSON.stringify(value),
    },
  });

  const macros: MacroItem[] = [
    { label: "Calories", value: recipe.calories, unit: "kcal" },
    { label: "Protein", value: recipe.protein, unit: "g" },
    { label: "Carbs", value: recipe.carbs, unit: "g" },
    { label: "Fat", value: recipe.fat, unit: "g" },
    { label: "Fiber", value: recipe.fiber, unit: "g" },
  ];

  const hasNoNutritionData =
    recipe.calories == null && recipe.protein == null && recipe.carbs == null && recipe.fat == null;

  const allergens = recipe.allergens;
  const hasAllergens = allergens != null && allergens.length > 0;

  const userAllergenSet = new Set<Allergen>(userAllergens);

  if (hasNoNutritionData && !hasAllergens) {
    return <Muted className="text-center py-4">No nutrition data available</Muted>;
  }

  return (
    <View className="gap-4">
      {/* Macro row */}
      <View className="flex-row justify-between">
        {macros.map((macro) => (
          <View key={macro.label} className="items-center gap-1">
            <P className="font-urbanist-semibold text-foreground">
              {formatMacro(macro.value)}
              <P className="text-muted-foreground"> {macro.unit}</P>
            </P>
            <Muted className="text-xs">{macro.label}</Muted>
          </View>
        ))}
      </View>

      {/* Allergen badges */}
      {hasAllergens && (
        <View className="flex-row flex-wrap gap-2">
          {allergens.map((allergen) => {
            const isUserAllergen = userAllergenSet.has(allergen as Allergen);
            return (
              <View
                key={allergen}
                className={`rounded-full px-3 py-1 ${
                  isUserAllergen ? "bg-destructive/10" : "bg-muted"
                }`}
              >
                <P
                  className={`text-xs capitalize ${
                    isUserAllergen ? "text-destructive font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {allergen}
                </P>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
