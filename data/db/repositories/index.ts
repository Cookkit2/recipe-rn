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
import { HouseholdRepository } from "./HouseholdRepository";
import { HouseholdMemberRepository } from "./HouseholdMemberRepository";

// Export all repositories for easy importing
export { RecipeRepository } from "./RecipeRepository";
export { StockRepository } from "./StockRepository";
export { CookingHistoryRepository } from "./CookingHistoryRepository";
export { TailoredRecipeMappingRepository } from "./TailoredRecipeMappingRepository";
export { AchievementRepository } from "./AchievementRepository";
export { UserAchievementRepository } from "./UserAchievementRepository";
export { ChallengeRepository } from "./ChallengeRepository";
export { UserChallengeRepository } from "./UserChallengeRepository";
export { WasteLogRepository } from "./WasteLogRepository";

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
let recipeRepository: RecipeRepository | null = null;
let stockRepository: StockRepository | null = null;
let cookingHistoryRepository: CookingHistoryRepository | null = null;
let ingredientCategoryRepository: IngredientCategoryRepository | null = null;
let ingredientSynonymRepository: IngredientSynonymRepository | null = null;
let stockCategoryRepository: StockCategoryRepository | null = null;
let mealPlanRepository: MealPlanRepository | null = null;
let groceryItemCheckRepository: GroceryItemCheckRepository | null = null;
let tailoredRecipeMappingRepository: TailoredRecipeMappingRepository | null = null;
let achievementRepository: AchievementRepository | null = null;
let userAchievementRepository: UserAchievementRepository | null = null;
let challengeRepository: ChallengeRepository | null = null;
let userChallengeRepository: UserChallengeRepository | null = null;
let wasteLogRepository: WasteLogRepository | null = null;
export let recipeVersionRepository: RecipeVersionRepository | null = null;
let consumptionLogRepository: ConsumptionLogRepository | null = null;
let householdRepository: HouseholdRepository | null = null;
let householdMemberRepository: HouseholdMemberRepository | null = null;

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
  if (!householdRepository) {
    householdRepository = new HouseholdRepository();
  }
  if (!householdMemberRepository) {
    householdMemberRepository = new HouseholdMemberRepository();
  }

  return {
    consumptionLogRepository,
    householdRepository,
    householdMemberRepository,
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
