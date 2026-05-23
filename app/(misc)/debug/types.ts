import type Recipe from "~/data/db/models/Recipe";
import type { RecipeWithDetails } from "~/data/db/DatabaseFacade";

export type DebugRecipe = Recipe & { details?: RecipeWithDetails | null };
