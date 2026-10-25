import { SectionList, View, ActivityIndicator } from "react-native";
import { P, Small } from "~/components/ui/typography";
import { Separator } from "~/components/ui/separator";
import { RecipeResultItem } from "./RecipeResults";
import { IngredientResultItem } from "./IngredientResults";
import type { Recipe } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type useColors from "~/hooks/useColor";
import { useMemo } from "react";

type Row = { kind: "recipe"; recipe: Recipe } | { kind: "ingredient"; item: PantryItem };
type Section = { title: string; data: Row[] };

export function SearchResultsList({
  recipes,
  ingredients,
  colors,
  hasQuery,
  loading,
  top,
  bottom,
}: {
  recipes: readonly Recipe[];
  ingredients: readonly PantryItem[];
  colors: ReturnType<typeof useColors>;
  hasQuery: boolean;
  loading: boolean;
  top: number;
  bottom: number;
}) {
  const sections = useMemo<Section[]>(
    () =>
      !hasQuery
        ? []
        : [
            ...(ingredients.length
              ? [
                  {
                    title: "Pantry",
                    data: ingredients.map((item): Row => ({ kind: "ingredient", item })),
                  },
                ]
              : []),
            ...(recipes.length
              ? [
                  {
                    title: "Recipes",
                    data: recipes.map((recipe): Row => ({ kind: "recipe", recipe })),
                  },
                ]
              : []),
          ],
    [hasQuery, ingredients, recipes]
  );
  return (
    <SectionList<Row, Section>
      testID="search-results"
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingBottom: bottom + 64, paddingTop: top + 10 }}
      sections={sections}
      keyExtractor={(row) =>
        row.kind === "recipe" ? `recipe:${row.recipe.id}` : `ingredient:${row.item.id}`
      }
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      renderItem={({ item, index, section }) =>
        item.kind === "recipe" ? (
          <RecipeResultItem recipe={item.recipe} isLast={index === section.data.length - 1} />
        ) : (
          <IngredientResultItem
            item={item.item}
            index={index}
            colors={colors}
            isLast={index === section.data.length - 1}
          />
        )
      }
      renderSectionHeader={({ section }) => (
        <View>
          <Small className="text-lg font-urbanist-black opacity-80 px-5">{section.title}</Small>
          <Separator className="mt-1 mx-5" />
        </View>
      )}
      renderSectionFooter={() => <View className="h-5" />}
      ListHeaderComponent={
        loading ? (
          <View className="items-center py-8 gap-2">
            <ActivityIndicator size="small" color={colors.mutedForeground} />
            <P className="text-xs text-muted-foreground">Searching...</P>
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        !loading ? (
          <View className="items-center px-6 py-8">
            <P className="text-sm text-muted-foreground text-center">
              {hasQuery ? "No results found" : "Search pantry items or recipes."}
            </P>
          </View>
        ) : undefined
      }
    />
  );
}
