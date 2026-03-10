import React from "react";
import { View, Image } from "react-native";
import { ChefHatIcon, StarIcon } from "lucide-uniwind";
import { H4, Small } from "~/components/ui/typography";
import { useSearchRecipes } from "~/hooks/queries/useRecipeQueries";
import { SearchResultSection, SearchResultRow } from "./SearchResultPrimitives";

type Recipe = NonNullable<ReturnType<typeof useSearchRecipes>["data"]>[number];

type RecipeResultItemProps = {
  recipe: Recipe;
  isLast: boolean;
};

function RecipeResultItem({ recipe, isLast }: RecipeResultItemProps) {
  return (
    <SearchResultRow
      href={`/recipes/${recipe.id}`}
      isLast={isLast}
      media={
        recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            className="w-24 h-24 rounded-xl border-continuous"
            resizeMode="cover"
          />
        ) : (
          <View className="w-24 h-24 bg-muted items-center justify-center rounded-xl">
            <ChefHatIcon size={24} className="text-muted-foreground" />
          </View>
        )
      }
    >
      <H4 className="text-foreground font-urbanist-semibold" numberOfLines={1}>
        {recipe.title}
      </H4>
      <View className="flex-row items-center mt-1">
        {recipe.prepMinutes != null && (
          <Small className="text-muted-foreground font-urbanist-medium">
            {`${recipe.prepMinutes + (recipe.cookMinutes ?? 0)}m · `}
          </Small>
        )}
        {recipe.difficultyStars != null && (
          <View className="flex-row items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon
                key={i}
                size={11}
                strokeWidth={2}
                className={
                  i < recipe.difficultyStars! ? "text-amber-400" : "text-muted-foreground/30"
                }
                fill={i < recipe.difficultyStars! ? "#fbbf24" : "transparent"}
              />
            ))}
          </View>
        )}
      </View>
    </SearchResultRow>
  );
}

type RecipeResultsProps = {
  recipes: ReturnType<typeof useSearchRecipes>["data"];
};

export function RecipeResults({ recipes }: RecipeResultsProps) {
  if (!recipes || recipes.length === 0) return null;
  return (
    <SearchResultSection title="Recipes">
      {recipes.map((recipe, index) => (
        <RecipeResultItem key={recipe.id} recipe={recipe} isLast={index === recipes.length - 1} />
      ))}
    </SearchResultSection>
  );
}
