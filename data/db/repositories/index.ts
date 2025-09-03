// Import repository classes
import { BaseRepository } from "./BaseRepository";
import { RecipeRepository } from "./RecipeRepository";
import { BaseIngredientRepository } from "./BaseIngredientRepository";
import { StockRepository } from "./StockRepository";

// Export all repositories for easy importing
export { BaseRepository } from "./BaseRepository";
export { RecipeRepository } from "./RecipeRepository";
export { BaseIngredientRepository } from "./BaseIngredientRepository";
export { StockRepository } from "./StockRepository";

// Export repository interfaces
export type { PaginationOptions, SearchOptions } from "./BaseRepository";
export type {
  RecipeSearchOptions,
  CreateRecipeWithDetailsData,
} from "./RecipeRepository";
export type { IngredientSearchOptions } from "./BaseIngredientRepository";
export type {
  StockSearchOptions,
  StockWithIngredient,
} from "./StockRepository";

// Simple repository instances - will be created when needed
export let recipeRepository: RecipeRepository | null = null;
export let baseIngredientRepository: BaseIngredientRepository | null = null;
export let stockRepository: StockRepository | null = null;

// Initialize repositories - called by DatabaseFacade
export function initializeRepositories() {
  if (!recipeRepository) {
    recipeRepository = new RecipeRepository();
  }
  if (!baseIngredientRepository) {
    baseIngredientRepository = new BaseIngredientRepository();
  }
  if (!stockRepository) {
    stockRepository = new StockRepository();
  }

  return {
    recipeRepository,
    baseIngredientRepository,
    stockRepository,
  };
}
