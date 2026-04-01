// Import repository classes
import { RecipeRepository } from "./RecipeRepository";
import { StockRepository } from "./StockRepository";
import { CookingHistoryRepository } from "./CookingHistoryRepository";
import { IngredientCategoryRepository } from "./IngredientCategoryRepository";
import { IngredientSynonymRepository } from "./IngredientSynonymRepository";
import { StockCategoryRepository } from "./StockCategoryRepository";
import { MealPlanRepository } from "./MealPlanRepository";
import { GroceryItemCheckRepository } from "./GroceryItemCheckRepository";
import { TailoredRecipeMappingRepository } from "./TailoredRecipeMappingRepository";
import { AchievementRepository } from "./AchievementRepository";
import { UserAchievementRepository } from "./UserAchievementRepository";
import { ChallengeRepository } from "./ChallengeRepository";
import { UserChallengeRepository } from "./UserChallengeRepository";
import { WasteLogRepository } from "./WasteLogRepository";
import { RecipeVersionRepository } from "./RecipeVersionRepository";
import { ConsumptionLogRepository } from "./ConsumptionLogRepository";

// Export all repositories for easy importing
export { BaseRepository } from "./BaseRepository";
export { RecipeRepository } from "./RecipeRepository";
export { StockRepository } from "./StockRepository";
export { CookingHistoryRepository } from "./CookingHistoryRepository";
export { IngredientCategoryRepository } from "./IngredientCategoryRepository";
export { IngredientSynonymRepository } from "./IngredientSynonymRepository";
export { StockCategoryRepository } from "./StockCategoryRepository";
export { MealPlanRepository } from "./MealPlanRepository";
export { GroceryItemCheckRepository } from "./GroceryItemCheckRepository";
export { TailoredRecipeMappingRepository } from "./TailoredRecipeMappingRepository";
export { AchievementRepository } from "./AchievementRepository";
export { UserAchievementRepository } from "./UserAchievementRepository";
export { ChallengeRepository } from "./ChallengeRepository";
export { UserChallengeRepository } from "./UserChallengeRepository";
export { WasteLogRepository } from "./WasteLogRepository";
export { RecipeVersionRepository } from "./RecipeVersionRepository";

// Export repository interfaces
export type { PaginationOptions, SearchOptions } from "./BaseRepository";
export type { RecipeSearchOptions, CreateRecipeWithDetailsData } from "./RecipeRepository";
export type { StockSearchOptions } from "./StockRepository";
export type { CookingHistorySearchOptions } from "./CookingHistoryRepository";
export type { MealPlanSearchOptions } from "./MealPlanRepository";
export type { CreateTailoredRecipeWithDetailsData } from "./TailoredRecipeMappingRepository";
export type { AchievementSearchOptions } from "./AchievementRepository";
export type { UserAchievementSearchOptions } from "./UserAchievementRepository";
export type { ChallengeSearchOptions } from "./ChallengeRepository";
export type { UserChallengeSearchOptions } from "./UserChallengeRepository";
export type { WasteLogSearchOptions, WasteStats, WasteOverTimeData } from "./WasteLogRepository";

// Simple repository instances - will be created when needed
export let recipeRepository: RecipeRepository | null = null;
export let stockRepository: StockRepository | null = null;
export let cookingHistoryRepository: CookingHistoryRepository | null = null;
export let ingredientCategoryRepository: IngredientCategoryRepository | null = null;
export let ingredientSynonymRepository: IngredientSynonymRepository | null = null;
export let stockCategoryRepository: StockCategoryRepository | null = null;
export let mealPlanRepository: MealPlanRepository | null = null;
export let groceryItemCheckRepository: GroceryItemCheckRepository | null = null;
export let tailoredRecipeMappingRepository: TailoredRecipeMappingRepository | null = null;
export let achievementRepository: AchievementRepository | null = null;
export let userAchievementRepository: UserAchievementRepository | null = null;
export let challengeRepository: ChallengeRepository | null = null;
export let userChallengeRepository: UserChallengeRepository | null = null;
export let wasteLogRepository: WasteLogRepository | null = null;
export let recipeVersionRepository: RecipeVersionRepository | null = null;
export let consumptionLogRepository: ConsumptionLogRepository | null = null;

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
  if (!mealPlanRepository) {
    mealPlanRepository = new MealPlanRepository();
  }
  if (!groceryItemCheckRepository) {
    groceryItemCheckRepository = new GroceryItemCheckRepository();
  }
  if (!tailoredRecipeMappingRepository) {
    tailoredRecipeMappingRepository = new TailoredRecipeMappingRepository();
  }
  if (!achievementRepository) {
    achievementRepository = new AchievementRepository();
  }
  if (!userAchievementRepository) {
    userAchievementRepository = new UserAchievementRepository();
  }
  if (!challengeRepository) {
    challengeRepository = new ChallengeRepository();
  }
  if (!userChallengeRepository) {
    userChallengeRepository = new UserChallengeRepository();
  }
  if (!wasteLogRepository) {
    wasteLogRepository = new WasteLogRepository();
  }
  if (!recipeVersionRepository) {
    recipeVersionRepository = new RecipeVersionRepository();
  }

  if (!consumptionLogRepository) {
    consumptionLogRepository = new ConsumptionLogRepository();
  }

  return {
    consumptionLogRepository,
    recipeRepository,
    stockRepository,
    cookingHistoryRepository,
    ingredientCategoryRepository,
    ingredientSynonymRepository,
    stockCategoryRepository,
    mealPlanRepository,
    groceryItemCheckRepository,
    tailoredRecipeMappingRepository,
    achievementRepository,
    userAchievementRepository,
    challengeRepository,
    userChallengeRepository,
    wasteLogRepository,
  };
}
