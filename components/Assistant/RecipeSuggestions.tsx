import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { toAssistantPlainText } from "~/lib/agent/plain-text";
import type { RecipeSuggestionsResult } from "~/lib/agent/recipe-suggestions";

export function RecipeSuggestions({ result }: { result: RecipeSuggestionsResult }) {
  const groups = [
    {
      title: "Ready to cook",
      recipes: result.recipes.filter((recipe) => recipe.missing.length === 0),
    },
    {
      title: "Needs extra ingredients",
      recipes: result.recipes.filter((recipe) => recipe.missing.length > 0),
    },
  ];
  return (
    <View className="gap-3">
      {result.recipes.length === 0 ? (
        <Text>No matching recipes found in the available catalog.</Text>
      ) : null}
      {groups.map((group) =>
        group.recipes.length > 0 ? (
          <View key={group.title} className="gap-2">
            <Text className="font-semibold">{group.title}</Text>
            {group.recipes.map((recipe) => (
              <View key={recipe.id} className="gap-1">
                <Text className="font-semibold">{toAssistantPlainText(recipe.title)}</Text>
                <Text>Have: {toAssistantPlainText(recipe.matched.join(", "))}</Text>
                {recipe.missing.length > 0 ? (
                  <Text>Need: {toAssistantPlainText(recipe.missing.join(", "))}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null
      )}
      {result.recipes.length > 0 ? (
        <Text className="text-sm text-muted-foreground">
          Ingredient names matched; quantities haven't been checked.
        </Text>
      ) : null}
      {result.truncated ? (
        <Text className="text-sm text-muted-foreground">
          Matches are from part of the recipe catalog.
        </Text>
      ) : null}
    </View>
  );
}
