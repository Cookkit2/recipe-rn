import { SectionList, View, ActivityIndicator, Pressable } from "react-native";
import { P, Small } from "~/components/ui/typography";
import { Separator } from "~/components/ui/separator";
import { RecipeResultItem } from "./RecipeResults";
import { IngredientResultItem } from "./IngredientResults";
import type { Recipe } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type useColors from "~/hooks/useColor";
import { useMemo, type ReactElement } from "react";
import { WebRecipeResultItem } from "./WebRecipeResultItem";
import type { WebRecipeSearchResult } from "~/types/WebRecipeSearch";

type Row =
  | { kind: "recipe"; recipe: Recipe }
  | { kind: "ingredient"; item: PantryItem }
  | { kind: "web"; result: WebRecipeSearchResult };
type Section = { title: string; data: Row[] };

export function SearchResultsList({
  recipes,
  ingredients,
  colors,
  hasQuery,
  loading,
  top,
  bottom,
  header,
  transparent = false,
  web,
}: {
  recipes: readonly Recipe[];
  ingredients: readonly PantryItem[];
  colors: ReturnType<typeof useColors>;
  hasQuery: boolean;
  loading: boolean;
  top: number;
  bottom: number;
  header?: ReactElement;
  transparent?: boolean;
  web?: {
    results: readonly WebRecipeSearchResult[];
    loading: boolean;
    error: boolean;
    errorMessage?: string;
    submitted: boolean;
    onRetry: () => void;
    onOpen: (result: WebRecipeSearchResult) => void;
  };
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
            ...(web?.results.length
              ? [
                  {
                    title: "From the web",
                    data: web.results.map((result): Row => ({ kind: "web", result })),
                  },
                ]
              : []),
          ],
    [hasQuery, ingredients, recipes, web?.results]
  );
  return (
    <SectionList<Row, Section>
      testID="search-results"
      className={transparent ? "flex-1" : "flex-1 bg-background"}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingBottom: bottom + 64, paddingTop: top + 10 }}
      sections={sections}
      keyExtractor={(row) =>
        row.kind === "recipe"
          ? `recipe:${row.recipe.id}`
          : row.kind === "web"
            ? `web:${row.result.url}`
            : `ingredient:${row.item.id}`
      }
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      renderItem={({ item, index, section }) =>
        item.kind === "recipe" ? (
          <RecipeResultItem recipe={item.recipe} isLast={index === section.data.length - 1} />
        ) : item.kind === "web" ? (
          <WebRecipeResultItem
            result={item.result}
            isLast={index === section.data.length - 1}
            onPress={web!.onOpen}
          />
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
        <View className="px-5">
          {header}
          {loading ? (
            <View className="items-center py-8 gap-2">
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <P className="text-xs text-muted-foreground">Searching...</P>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !loading && !web?.loading && !web?.submitted ? (
          <View className="items-center px-6 py-8">
            <P className="text-sm text-muted-foreground text-center">
              {hasQuery
                ? "No results found"
                : "Search ingredients and recipes, or ask about your pantry."}
            </P>
          </View>
        ) : undefined
      }
      ListFooterComponent={
        web?.submitted ? (
          <View className="px-5 py-4 gap-3 items-center">
            {web.loading ? (
              <>
                <ActivityIndicator color={colors.mutedForeground} />
                <P className="text-sm text-muted-foreground">Searching the web…</P>
              </>
            ) : web.error ? (
              <>
                <P accessibilityRole="alert" className="text-sm text-muted-foreground text-center">
                  {web.errorMessage || "Couldn’t search the web. Please try again."}
                </P>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry web search"
                  onPress={web.onRetry}
                  className="rounded-full bg-muted px-4 py-2"
                >
                  <P>Try again</P>
                </Pressable>
              </>
            ) : web.results.length === 0 ? (
              <P className="text-sm text-muted-foreground">
                No web recipes found. Try another search.
              </P>
            ) : null}
          </View>
        ) : undefined
      }
    />
  );
}
