import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "~/components/ui/text";
import RecipeItemCard from "~/components/Pantry/RecipeItemCard";
import type { Recipe } from "~/types/Recipe";
import { toAssistantPlainText } from "~/lib/agent/plain-text";
import type { RecipeSuggestionsResult } from "~/lib/agent/recipe-suggestions";

export function RecipeSuggestions({
  result,
  onOpenRecipe,
  stockIds = [],
  recipes = [],
}: {
  result: RecipeSuggestionsResult;
  stockIds?: readonly string[];
  recipes?: readonly Recipe[];
  onOpenRecipe?: (id: string) => void;
}) {
  const catalogById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes]
  );
  const groups = [
    {
      title: "Matches your pantry",
      recipes: result.recipes.filter((recipe) => recipe.missing.length === 0),
    },
    {
      title: "Needs extra ingredients",
      recipes: result.recipes.filter((recipe) => recipe.missing.length > 0),
    },
  ];
  return (
    <View className="gap-4">
      {!result.recipes.length ? (
        <Text className="font-urbanist-medium text-muted-foreground">
          No matching recipes found in the available catalog.
        </Text>
      ) : null}
      {groups.map((group) =>
        group.recipes.length ? (
          <View key={group.title} className="gap-2">
            <Text className="font-urbanist-semibold">{group.title}</Text>
            <View className="flex-row flex-wrap -mx-3">
              {group.recipes.map((recipe) => {
                const catalogRecipe = catalogById.get(recipe.id);
                return catalogRecipe ? (
                  <View key={recipe.id} className="w-1/2">
                    <RecipeItemCard
                      recipe={catalogRecipe}
                      titleClassName="text-foreground text-base leading-5 font-urbanist-medium opacity-100"
                    />
                    <Text className="text-xs font-urbanist-medium text-muted-foreground px-3 pb-3">
                      {recipe.missing.length
                        ? `${recipe.missing.length} extra ingredient${recipe.missing.length === 1 ? "" : "s"}`
                        : "Matches your pantry"}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    key={recipe.id}
                    className="gap-1 w-full px-3 py-2"
                    accessibilityRole={onOpenRecipe ? "button" : undefined}
                    accessibilityLabel={
                      onOpenRecipe
                        ? `Open recipe: ${toAssistantPlainText(recipe.title, stockIds)}`
                        : undefined
                    }
                    disabled={!onOpenRecipe}
                    onPress={() => onOpenRecipe?.(recipe.id)}
                  >
                    <Text className="font-urbanist-semibold">
                      {toAssistantPlainText(recipe.title, stockIds)}
                    </Text>
                    <Text className="font-urbanist-medium text-sm text-muted-foreground">
                      Have: {toAssistantPlainText(recipe.matched.join(", "), stockIds)}
                    </Text>
                    {recipe.missing.length ? (
                      <Text className="font-urbanist-medium text-sm text-muted-foreground">
                        Need: {toAssistantPlainText(recipe.missing.join(", "), stockIds)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null
      )}
      {result.recipes.length ? (
        <Text className="text-xs font-urbanist-medium text-muted-foreground">
          Ingredient names matched; quantities haven't been checked.
        </Text>
      ) : null}
      {result.truncated ? (
        <Text className="text-xs font-urbanist-medium text-muted-foreground">
          Matches are from part of the recipe catalog.
        </Text>
      ) : null}
    </View>
  );
}
