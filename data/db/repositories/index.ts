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

// Create repository instances for easy usage
export const recipeRepository = new RecipeRepository();
export const baseIngredientRepository = new BaseIngredientRepository();
export const stockRepository = new StockRepository();
