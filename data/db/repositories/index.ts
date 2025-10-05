// Import repository classes
import { RecipeRepository } from "./RecipeRepository";
import { StockRepository } from "./StockRepository";
import { CookingHistoryRepository } from "./CookingHistoryRepository";
import { IngredientCategoryRepository } from "./IngredientCategoryRepository";
import { IngredientSynonymRepository } from "./IngredientSynonymRepository";
import { StockCategoryRepository } from "./StockCategoryRepository";

// Export all repositories for easy importing
export { BaseRepository } from "./BaseRepository";
export { RecipeRepository } from "./RecipeRepository";
export { StockRepository } from "./StockRepository";
export { CookingHistoryRepository } from "./CookingHistoryRepository";
export { IngredientCategoryRepository } from "./IngredientCategoryRepository";
export { IngredientSynonymRepository } from "./IngredientSynonymRepository";
export { StockCategoryRepository } from "./StockCategoryRepository";

// Export repository interfaces
export type { PaginationOptions, SearchOptions } from "./BaseRepository";
export type {
  RecipeSearchOptions,
  CreateRecipeWithDetailsData,
} from "./RecipeRepository";
export type { StockSearchOptions } from "./StockRepository";
export type { CookingHistorySearchOptions } from "./CookingHistoryRepository";

// Simple repository instances - will be created when needed
export let recipeRepository: RecipeRepository | null = null;
export let stockRepository: StockRepository | null = null;
export let cookingHistoryRepository: CookingHistoryRepository | null = null;
export let ingredientCategoryRepository: IngredientCategoryRepository | null =
  null;
export let ingredientSynonymRepository: IngredientSynonymRepository | null =
  null;
export let stockCategoryRepository: StockCategoryRepository | null = null;

// Initialize repositories - called by DatabaseFacade
export function initializeRepositories() {
  if (!recipeRepository) {
    recipeRepository = new RecipeRepository();
  }
  if (!stockRepository) {
    stockRepository = new StockRepository();
  }
  if (!cookingHistoryRepository) {
    cookingHistoryRepository = new CookingHistoryRepository();
  }
  if (!ingredientCategoryRepository) {
    ingredientCategoryRepository = new IngredientCategoryRepository();
  }
  if (!ingredientSynonymRepository) {
    ingredientSynonymRepository = new IngredientSynonymRepository();
  }
  if (!stockCategoryRepository) {
    stockCategoryRepository = new StockCategoryRepository();
  }

  return {
    recipeRepository,
    stockRepository,
    cookingHistoryRepository,
    ingredientCategoryRepository,
    ingredientSynonymRepository,
    stockCategoryRepository,
  };
}
