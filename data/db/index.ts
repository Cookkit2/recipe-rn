// Main database exports
export { default as database, collections } from './database';
export { default as schema } from './schema';
export { default as migrations } from './migrations';

// Model exports (for type usage only)
export type {
  Recipe,
  RecipeStep,
  RecipeIngredient,
  Stock,
  CookingHistory,
  StepsToStore,
} from './models';

// Database facade - ONLY public API
export { DatabaseFacade, databaseFacade } from './DatabaseFacade';

// Export types from DatabaseFacade for convenience
export type {
  CreateStockData,
  UpdateStockData,
  CreateRecipeData,
  RecordCookingData,
  DatabaseStats,
  ShoppingListResult,
  AvailableRecipesResult,
  RecipeWithDetails,
} from './DatabaseFacade';

// Default export is the database facade for convenience
export { databaseFacade as default } from './DatabaseFacade';
