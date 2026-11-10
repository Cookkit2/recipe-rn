import { SectionList, View, ActivityIndicator, Pressable } from "react-native";
import { SearchKeyboardViewport } from "./SearchKeyboardViewport";
import { SearchHelperText } from "./SearchHelperText";
import { P, Small } from "~/components/ui/typography";
import { Separator } from "~/components/ui/separator";
import { RecipeResultItem } from "./RecipeResults";
import { IngredientResultItem } from "./IngredientResults";
import type { Recipe } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type useColors from "~/hooks/useColor";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { WebRecipeResultItem, WebRecipeResultSkeleton } from "./WebRecipeResultItem";
import type { WebRecipeSearchResult } from "~/types/WebRecipeSearch";

type Row =
  | { kind: "recipe"; recipe: Recipe }
  | { kind: "ingredient"; item: PantryItem }
  | { kind: "web"; result: WebRecipeSearchResult }
  | { kind: "web-loading"; id: string };
type Section = { kind: "pantry" | "recipes" | "web"; title: string; data: Row[] };

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
  query = "",
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
  query?: string;
  web?: {
    results: readonly WebRecipeSearchResult[];
    loading: boolean;
    error: boolean;
    errorMessage?: string;
    submitted: boolean;
    canSearch?: boolean;
    onSearch?: () => void;
    onRetry: () => void;
    onOpen: (result: WebRecipeSearchResult) => void;
  };
}) {
  const [recipesExpanded, setRecipesExpanded] = useState(false);
  useEffect(() => setRecipesExpanded(false), [query]);
  const sections = useMemo<Section[]>(
    () =>
      !hasQuery
        ? []
        : [
            ...(ingredients.length
              ? [
                  {
                    kind: "pantry" as const,
                    title: "Pantry",
                    data: ingredients.map((item): Row => ({ kind: "ingredient", item })),
                  },
                ]
              : []),
            ...(recipes.length
              ? [
                  {
                    kind: "recipes" as const,
                    title: "Recipes",
                    data: (recipesExpanded ? recipes : recipes.slice(0, 2)).map((recipe): Row => ({
                      kind: "recipe",
                      recipe,
                    })),
                  },
                ]
              : []),
            ...(web?.submitted && (web.loading || web.results.length)
              ? [
                  {
                    kind: "web" as const,
                    title: "From the web",
                    data: web.loading
                      ? [0, 1].map((index): Row => ({ kind: "web-loading", id: String(index) }))
                      : web.results.map((result): Row => ({ kind: "web", result })),
                  },
                ]
              : []),
          ],
    [hasQuery, ingredients, recipes, recipesExpanded, web?.submitted, web?.loading, web?.results]
  );
  return (
    <SearchKeyboardViewport testID="search-results-viewport">
      <SectionList<Row, Section>
        testID="search-results"
        className={transparent ? "flex-1" : "flex-1 bg-background"}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={false}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: bottom + 64, paddingTop: top + 10 }}
        sections={sections}
        keyExtractor={(row) =>
          row.kind === "recipe"
            ? `recipe:${row.recipe.id}`
            : row.kind === "web"
              ? `web:${row.result.url}`
              : row.kind === "web-loading"
                ? `web-loading:${row.id}`
                : `ingredient:${row.item.id}`
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        renderItem={({ item, index, section }) =>
          item.kind === "recipe" ? (
            <RecipeResultItem recipe={item.recipe} isLast={index === section.data.length - 1} />
          ) : item.kind === "web-loading" ? (
            <WebRecipeResultSkeleton />
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
            <View
              testID={section.kind === "recipes" ? "search-recipes-header" : undefined}
              className="flex-row items-center justify-between px-5"
            >
              <Small className="text-lg font-urbanist-black opacity-80">{section.title}</Small>
              {section.kind === "recipes" && recipes.length > 2 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={recipesExpanded ? "Show fewer recipes" : "See all recipes"}
                  accessibilityState={{ expanded: recipesExpanded }}
                  onPress={() => setRecipesExpanded((expanded) => !expanded)}
                  className="min-h-11 justify-center pl-3"
                  hitSlop={8}
                >
                  <Small className="text-sm text-muted-foreground">
                    {recipesExpanded ? "See less" : "See all"}
                  </Small>
                </Pressable>
              ) : null}
            </View>
            <Separator className="mt-1 mx-5" />
          </View>
        )}
        renderSectionFooter={({ section }) => (
          <View className={section.kind === "recipes" ? "h-1" : "h-5"} />
        )}
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
              {hasQuery ? (
                <P className="text-sm text-muted-foreground text-center">No results found</P>
              ) : (
                <SearchHelperText>Search your pantry and recipes.</SearchHelperText>
              )}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          web?.canSearch && !web.submitted && web.onSearch ? (
            <View testID="web-search-action" className="items-center px-5 pt-1 pb-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search the web"
                onPress={web.onSearch}
                className="rounded-full bg-muted px-4 py-2"
                hitSlop={8}
              >
                <Small className="text-sm text-muted-foreground">Search the web</Small>
              </Pressable>
            </View>
          ) : web?.submitted && !web.loading ? (
            <View className="px-5 py-4 gap-3 items-center">
              {web.error ? (
                <>
                  <P
                    accessibilityRole="alert"
                    className="text-sm text-muted-foreground text-center"
                  >
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
    </SearchKeyboardViewport>
  );
}
