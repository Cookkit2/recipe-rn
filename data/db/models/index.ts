// Export all models for easy importing
export { default as Recipe } from "./Recipe";
export { default as RecipeStep } from "./RecipeStep";
export { default as BaseIngredient } from "./BaseIngredient";
export { default as IngredientCategory } from "./IngredientCategory";
export { default as RecipeIngredient } from "./RecipeIngredient";
export { default as IngredientCategoryAssignment } from "./IngredientCategoryAssignment";
export { default as Stock } from "./Stock";
export { default as StepsToStore } from "./StepsToStore";
export { default as User } from "./User";

// Export data interfaces
export type { RecipeData } from "./Recipe";
export type { RecipeStepData } from "./RecipeStep";
export type { BaseIngredientData } from "./BaseIngredient";
export type { IngredientCategoryData } from "./IngredientCategory";
export type { RecipeIngredientData } from "./RecipeIngredient";
export type { IngredientCategoryAssignmentData } from "./IngredientCategoryAssignment";
export type { StockData } from "./Stock";
export type { StepsToStoreData } from "./StepsToStore";
export type { UserData } from "./User";

// Model class array for database initialization
import Recipe from "./Recipe";
import RecipeStep from "./RecipeStep";
import BaseIngredient from "./BaseIngredient";
import IngredientCategory from "./IngredientCategory";
import RecipeIngredient from "./RecipeIngredient";
import IngredientCategoryAssignment from "./IngredientCategoryAssignment";
import Stock from "./Stock";
import StepsToStore from "./StepsToStore";
import User from "./User";

export const modelClasses = [
  Recipe,
  RecipeStep,
  BaseIngredient,
  IngredientCategory,
  RecipeIngredient,
  IngredientCategoryAssignment,
  Stock,
  StepsToStore,
  User,
];
