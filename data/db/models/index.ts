// Export all models for easy importing
export { default as Recipe } from "./Recipe";
export { default as RecipeStep } from "./RecipeStep";
export { default as RecipeIngredient } from "./RecipeIngredient";
export { default as Stock } from "./Stock";
export { default as StepsToStore } from "./StepsToStore";
export { default as CookingHistory } from "./CookingHistory";
export { default as IngredientCategory } from "./IngredientCategory";
export { default as IngredientSynonym } from "./IngredientSynonym";
export { default as StockCategory } from "./StockCategory";

// Export data interfaces
export type { RecipeData } from "./Recipe";
export type { RecipeStepData } from "./RecipeStep";
export type { RecipeIngredientData } from "./RecipeIngredient";
export type { StockData } from "./Stock";
export type { StepsToStoreData } from "./StepsToStore";
export type { CookingHistoryData } from "./CookingHistory";
export type { IngredientCategoryData } from "./IngredientCategory";
export type { IngredientSynonymData } from "./IngredientSynonym";
export type { StockCategoryData } from "./StockCategory";

// Model class array for database initialization
import Recipe from "./Recipe";
import RecipeStep from "./RecipeStep";
import RecipeIngredient from "./RecipeIngredient";
import Stock from "./Stock";
import StepsToStore from "./StepsToStore";
import CookingHistory from "./CookingHistory";
import IngredientCategory from "./IngredientCategory";
import IngredientSynonym from "./IngredientSynonym";
import StockCategory from "./StockCategory";

export const modelClasses = [
  Recipe,
  RecipeStep,
  RecipeIngredient,
  Stock,
  StepsToStore,
  CookingHistory,
  IngredientCategory,
  IngredientSynonym,
  StockCategory,
];
