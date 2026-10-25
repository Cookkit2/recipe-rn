import { useQuery } from "@tanstack/react-query";
import { fetchMyRecipes } from "~/data/api/myRecipesApi";
import { recipeQueryKeys } from "./recipeQueryKeys";

export function useMyRecipes() {
  return useQuery({
    queryKey: recipeQueryKeys.myRecipes(),
    queryFn: fetchMyRecipes,
    staleTime: 0,
    networkMode: "always",
  });
}
