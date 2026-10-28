import { useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useRecipes } from "~/hooks/queries/useRecipeQueries";
import { normalizeWebRecipeUrl } from "~/utils/web-recipe-search";
import SharedRecipeImport from "~/components/Recipe/SharedRecipeImport";
import RecipeDetailsSkeleton from "~/components/Recipe/Details/RecipeDetailsSkeleton";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";

/** Search results use a transient route; they never write the native share inbox. */
export default function ImportWebRecipeScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const url = normalizeWebRecipeUrl(params.url);
  const router = useRouter();
  const { data: recipes = [], isPending, isError, refetch } = useRecipes();
  const existing = url
    ? recipes.find((recipe) => normalizeWebRecipeUrl(recipe.sourceUrl) === url)
    : undefined;
  const pending = useMemo(() => (url ? { id: `web:${url}`, url } : null), [url]);
  useEffect(() => {
    if (existing) router.replace(`/recipes/${existing.id}`);
  }, [existing?.id, router]);

  if (!pending || isError)
    return (
      <View className="flex-1 bg-background justify-center items-center gap-4 px-6">
        <P className="text-center text-muted-foreground" accessibilityRole="alert">
          {!pending
            ? "This recipe link is not supported."
            : "Couldn’t check your saved recipes. Please try again."}
        </P>
        {pending ? (
          <Button
            variant="outline"
            onPress={() => {
              void refetch();
            }}
          >
            <P>Try again</P>
          </Button>
        ) : null}
      </View>
    );
  if (isPending || existing) return <RecipeDetailsSkeleton message="Opening recipe…" />;
  return <SharedRecipeImport key={pending.id} pending={pending} persisted={false} />;
}
