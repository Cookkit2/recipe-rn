// Export all models for easy importing
export { default as Recipe } from "./Recipe";
export { default as RecipeStep } from "./RecipeStep";
export { default as RecipeIngredient } from "./RecipeIngredient";
export { default as RecipeVersion } from "./RecipeVersion";
export { default as Stock } from "./Stock";
export { default as StepsToStore } from "./StepsToStore";
export { default as CookingHistory } from "./CookingHistory";
export { default as IngredientCategory } from "./IngredientCategory";
export { default as IngredientSynonym } from "./IngredientSynonym";
export { default as StockCategory } from "./StockCategory";
export { default as MealPlan } from "./MealPlan";
export { default as MealPlanTemplate } from "./MealPlanTemplate";
export { default as GroceryItemCheck } from "./GroceryItemCheck";
export { default as TailoredRecipeMapping } from "./TailoredRecipeMapping";
export { default as Achievement } from "./Achievement";
export { default as UserAchievement } from "./UserAchievement";
export { default as Challenge } from "./Challenge";
export { default as UserChallenge } from "./UserChallenge";
export { default as WasteLog } from "./WasteLog";

// Export data interfaces
export type { RecipeData, RecipeType } from "./Recipe";
export type { RecipeStepData } from "./RecipeStep";
export type { RecipeIngredientData } from "./RecipeIngredient";
export type { RecipeVersionData } from "./RecipeVersion";
export type { StockData } from "./Stock";
export type { StepsToStoreData } from "./StepsToStore";
export type { CookingHistoryData } from "./CookingHistory";
export type { IngredientCategoryData } from "./IngredientCategory";
export type { IngredientSynonymData } from "./IngredientSynonym";
export type { StockCategoryData } from "./StockCategory";
export type { MealPlanData } from "./MealPlan";
export type { MealPlanTemplateData } from "./MealPlanTemplate";
export type { GroceryItemCheckData } from "./GroceryItemCheck";
export type { TailoredRecipeMappingData } from "./TailoredRecipeMapping";
export type { AchievementModelData } from "./Achievement";
export type { UserAchievementData } from "./UserAchievement";
export type { ChallengeData } from "./Challenge";
export type { UserChallengeData } from "./UserChallenge";
export type { WasteLogData } from "./WasteLog";

// Model class array for database initialization
import Recipe from "./Recipe";
import RecipeStep from "./RecipeStep";
import RecipeIngredient from "./RecipeIngredient";
import RecipeVersion from "./RecipeVersion";
import Stock from "./Stock";
import StepsToStore from "./StepsToStore";
import CookingHistory from "./CookingHistory";
import IngredientCategory from "./IngredientCategory";
import IngredientSynonym from "./IngredientSynonym";
import StockCategory from "./StockCategory";
import MealPlan from "./MealPlan";
import MealPlanTemplate from "./MealPlanTemplate";
import GroceryItemCheck from "./GroceryItemCheck";
import TailoredRecipeMapping from "./TailoredRecipeMapping";
import Achievement from "./Achievement";
import UserAchievement from "./UserAchievement";
import Challenge from "./Challenge";
import UserChallenge from "./UserChallenge";
import WasteLog from "./WasteLog";

export const modelClasses = [
  Recipe,
  RecipeStep,
  RecipeIngredient,
  RecipeVersion,
  Stock,
  StepsToStore,
  CookingHistory,
  IngredientCategory,
  IngredientSynonym,
  StockCategory,
  MealPlan,
  MealPlanTemplate,
  GroceryItemCheck,
  TailoredRecipeMapping,
  Achievement,
  UserAchievement,
  Challenge,
  UserChallenge,
  WasteLog,
];
