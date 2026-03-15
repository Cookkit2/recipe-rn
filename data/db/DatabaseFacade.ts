import { database } from "./database";
import { Q } from "@nozbe/watermelondb";
import type {
  Recipe,
  RecipeStep,
  RecipeIngredient,
  Stock,
  CookingHistory,
  IngredientSynonym,
  StockCategory,
  IngredientCategory,
  Achievement,
  UserAchievement,
  Challenge,
  UserChallenge,
  WasteLog,
} from "./models";
import {
  initializeRepositories,
  RecipeRepository,
  StockRepository,
  CookingHistoryRepository,
  TailoredRecipeMappingRepository,
  AchievementRepository,
  UserAchievementRepository,
  ChallengeRepository,
  UserChallengeRepository,
  WasteLogRepository,
} from "./repositories";
import { RecipeType } from "./models/Recipe";
import type { RecipeSearchOptions } from "./repositories/RecipeRepository";
import type { StockSearchOptions } from "./repositories/StockRepository";
import type {
  WasteLogSearchOptions,
  WasteStats,
  WasteOverTimeData,
} from "./repositories/WasteLogRepository";
import { convertToUnitSystem, roundToReasonablePrecision } from "~/utils/unit-converter";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import { log } from "~/utils/logger";

// Public interfaces for database operations
export interface CreateStockData {
  name: string;
  quantity: number;
  unit: string;
  expirationDate?: number;
  purchaseDate?: number;
  notes?: string;
  storageType?: string;
  imageUrl?: string;
  backgroundColor?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface UpdateStockData {
  name?: string;
  quantity?: number;
  unit?: string;
  expirationDate?: number;
  purchaseDate?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface CreateRecipeData {
  title: string;
  description: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  sourceUrl?: string;
  calories?: number;
  tags?: string[];
  type?: RecipeType;
  steps?: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

export interface RecordCookingData {
  rating?: number;
  notes?: string;
  photoUrl?: string;
  servingsMade?: number;
}

export interface RecordWasteData {
  wasteDate?: number;
  reason?: string;
  estimatedCost?: number;
}

export interface DatabaseStats {
  recipes: number;
  stockItems: number;
  cookingHistory: number;
  totalRecords: number;
}

export interface ShoppingListResult {
  missingIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  availableIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    stockQuantity: number;
    stockUnit: string;
  }>;
}

export interface AvailableRecipesResult {
  canMake: Recipe[];
  partiallyCanMake: Array<{
    recipe: Recipe;
    completionPercentage: number;
  }>;
}

export interface RecipeWithDetails {
  recipe: Recipe;
  steps: Array<{
    id: string;
    step: number;
    title: string;
    description: string;
  }>;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

export interface TailoredRecipeWithDetails {
  recipe: Recipe;
  baseRecipeId: string;
  steps: Array<{
    id: string;
    step: number;
    title: string;
    description: string;
  }>;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

/**
 * Database Facade - Main interface for all structured database operations
 * This provides a unified, simplified API for accessing all database functionality.
 *
 * IMPORTANT: Only methods exposed here should be used throughout the app.
 * Direct repository access is private and should not be used externally.
 */
export class DatabaseFacade {
  // Private repository instances - not to be accessed directly
  private recipes: RecipeRepository;
  private stocks: StockRepository;
  private cookingHistory: CookingHistoryRepository;
  private tailoredRecipeMappings: TailoredRecipeMappingRepository;
  private achievements: AchievementRepository;
  private userAchievements: UserAchievementRepository;
  private challenges: ChallengeRepository;
  private userChallenges: UserChallengeRepository;
  private wasteLog: WasteLogRepository;

  constructor() {
    // Initialize repositories synchronously first
    const repositories = initializeRepositories();
    this.recipes = repositories.recipeRepository!;
    this.stocks = repositories.stockRepository!;
    this.cookingHistory = repositories.cookingHistoryRepository!;
    this.tailoredRecipeMappings = repositories.tailoredRecipeMappingRepository!;
    this.achievements = repositories.achievementRepository!;
    this.userAchievements = repositories.userAchievementRepository!;
    this.challenges = repositories.challengeRepository!;
    this.userChallenges = repositories.userChallengeRepository!;
    this.wasteLog = repositories.wasteLogRepository!;

    // Then initialize async features in the background
    this.initializeAsync();
  }

  private async initializeAsync() {
    try {
      await this.recipes.initialize();
    } catch (error) {
      // Log error to aid debugging, but prevent app crashes
      log.error("DatabaseFacade initialization failed:", error);
    }
  }

  // ============================================
  // RECIPE METHODS
  // ============================================

  /**
   * Get all recipes from the local database
   */
  async getAllRecipes(): Promise<Recipe[]> {
    return await this.recipes.findAll();
  }

  /**
   * Get a single recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    return await this.recipes.findById(id);
  }

  /**
   * Get recipe with all related data (steps and ingredients)
   */
  async getRecipeWithDetails(id: string): Promise<RecipeWithDetails | null> {
    const result = await this.recipes.getRecipeWithDetails(id);
    if (!result) return null;

    return {
      recipe: result.recipe,
      steps: result.steps.map((step) => ({
        id: step.id,
        step: step.step,
        title: step.title,
        description: step.description,
      })),
      ingredients: result.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
    };
  }

  /**
   * Get multiple recipes with their details in a single batch query.
   *
   * **Performance Benefit:** This method wraps RecipeRepository.getRecipesWithDetails()
   * to fetch all recipe details (steps, ingredients) in just 3 database queries total,
   * regardless of how many recipes are requested. This eliminates the N+1 query problem
   * that would occur if fetching each recipe's details individually.
   *
   * **When to use:** Use this method when you need to fetch details for multiple recipes
   * at once, such as in recipe lists, search results, or recommendation features.
   *
   * **When NOT to use:** For fetching a single recipe's details, use getRecipeWithDetails(id) instead.
   *
   * @param recipeIds - Array of recipe IDs to fetch details for
   * @returns Map<recipeId, RecipeWithDetails> where each entry contains the recipe with its steps and ingredients
   *
   * @example
   * // ✅ GOOD: Batch fetch for multiple recipes
   * const dbRecipes = await databaseFacade.getAllRecipes();
   * const recipeIds = dbRecipes.map(r => r.id);
   * const detailsMap = await databaseFacade.getRecipesWithDetails(recipeIds);
   *
   * @example
   * // ❌ BAD: Using this for a single recipe
   * const details = await databaseFacade.getRecipesWithDetails([singleId]);
   * // Instead use: await databaseFacade.getRecipeWithDetails(singleId);
   */
  async getRecipesWithDetails(recipeIds: string[]): Promise<Map<string, RecipeWithDetails>> {
    const resultMap = await this.recipes.getRecipesWithDetails(recipeIds);

    const transformedMap = new Map<string, RecipeWithDetails>();
    for (const [recipeId, details] of resultMap.entries()) {
      transformedMap.set(recipeId, {
        recipe: details.recipe,
        steps: details.steps.map((step) => ({
          id: step.id,
          step: step.step,
          title: step.title,
          description: step.description,
        })),
        ingredients: details.ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
        })),
      });
    }

    return transformedMap;
  }

  // ============================================
  // TAILORED RECIPE METHODS
  // ============================================

  async getTailoredRecipeById(id: string): Promise<Recipe | null> {
    const recipe = await this.recipes.findById(id);
    if (!recipe || recipe.type !== RecipeType.TAILORED) return null;
    return recipe;
  }

  async getTailoredRecipeWithDetails(id: string): Promise<TailoredRecipeWithDetails | null> {
    const result = await this.recipes.getRecipeWithDetails(id);
    if (!result || result.recipe.type !== RecipeType.TAILORED) return null;

    return {
      recipe: result.recipe,
      baseRecipeId: result.recipe.sourceUrl || "", // baseRecipeId is stored in sourceUrl
      steps: result.steps.map((step: RecipeStep) => ({
        id: step.id,
        step: step.step,
        title: step.title,
        description: step.description,
      })),
      ingredients: result.ingredients.map((ingredient: RecipeIngredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
    };
  }

  async getTailoredRecipeWithDetailsByBaseAndHash(
    baseRecipeId: string,
    pantryHash: string
  ): Promise<TailoredRecipeWithDetails | null> {
    const result = await this.tailoredRecipeMappings.findByBaseAndHash(baseRecipeId, pantryHash);
    if (!result) return null;

    return {
      recipe: result.recipe,
      baseRecipeId: result.recipe.sourceUrl || baseRecipeId,
      steps: result.steps.map((step: RecipeStep) => ({
        id: step.id,
        step: step.step,
        title: step.title,
        description: step.description,
      })),
      ingredients: result.ingredients.map((ingredient: RecipeIngredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
    };
  }

  async createTailoredRecipeWithDetails(data: {
    recipe: {
      baseRecipeId: string;
      pantryHash: string;
      title: string;
      description: string;
      imageUrl?: string;
      prepMinutes: number;
      cookMinutes: number;
      difficultyStars: number;
      servings: number;
      calories?: number;
      tags?: string[];
    };
    steps?: Array<{
      step: number;
      title: string;
      description: string;
    }>;
    ingredients?: Array<{
      name: string;
      quantity: number;
      unit: string;
      notes?: string;
    }>;
  }): Promise<Recipe> {
    return await this.tailoredRecipeMappings.createTailoredRecipeWithDetails({
      recipe: data.recipe,
      steps: data.steps?.map((step) => ({
        step: step.step,
        title: step.title,
        description: step.description,
      })),
      ingredients: data.ingredients?.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
    });
  }

  async deleteTailoredRecipe(id: string): Promise<void> {
    await this.tailoredRecipeMappings.deleteTailoredRecipe(id);
  }

  /**
   * Clear all tailored recipes for a given base recipe
   */
  async clearTailoredRecipesForBase(baseRecipeId: string): Promise<void> {
    await this.tailoredRecipeMappings.clearForBaseRecipe(baseRecipeId);
  }

  /**
   * Clean up expired tailored recipe mappings
   */
  async cleanupExpiredTailoredRecipes(): Promise<number> {
    return await this.tailoredRecipeMappings.cleanupExpired();
  }

  /**
   * Search recipes with filters
   */
  async searchRecipes(searchTerm?: string, options?: RecipeSearchOptions): Promise<Recipe[]> {
    return await this.recipes.searchRecipes({
      searchTerm,
      ...options,
    });
  }

  /**
   * Create a new recipe with steps and ingredients
   */
  async createRecipe(data: CreateRecipeData): Promise<Recipe> {
    return await this.recipes.createRecipeWithDetails({
      recipe: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        difficultyStars: data.difficultyStars,
        servings: data.servings,
        sourceUrl: data.sourceUrl,
        calories: data.calories,
        tags: data.tags || [],
        type: data.type,
      },
      steps: data.steps?.map((step) => ({
        step: step.step,
        title: step.title,
        description: step.description,
        recipeId: "", // Will be set by the repository
      })),
      ingredients: data.ingredients?.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        recipeId: "", // Will be set by the repository
      })),
    });
  }

  /**
   * Delete a recipe and all its related data
   */
  /**
   * Clear all recipes
   */
  async clearRecipes(): Promise<void> {
    await this.recipes.clearAllRecipes();
  }

  /**
   * Delete a recipe and all its related data
   */
  async deleteRecipe(id: string): Promise<void> {
    await this.recipes.delete(id);
  }

  /**
   * Toggle recipe favorite status
   */
  async toggleFavorite(recipeId: string): Promise<Recipe | null> {
    return await this.recipes.toggleFavorite(recipeId);
  }

  /**
   * Get all favorite recipes
   */
  async getFavoriteRecipes(): Promise<Recipe[]> {
    return await this.recipes.getFavoriteRecipes();
  }

  // ============================================
  // STOCK (PANTRY) METHODS
  // ============================================

  /**
   * Get all stock items from pantry
   */
  async getAllStock(): Promise<Stock[]> {
    return await this.stocks.findAll();
  }

  /**
   * Get total count of stock items
   */
  async getStockCount(): Promise<number> {
    return await this.stocks.count();
  }

  /**
   * Get a single stock item by ID
   */
  async getStockById(id: string): Promise<Stock | null> {
    return await this.stocks.findById(id);
  }

  /**
   * Get stock items by name or synonym
   * Updated to use new synonym matching
   */
  async getStockByIngredient(ingredientName: string): Promise<Stock[]> {
    return await this.stocks.findByNameOrSynonym(ingredientName);
  }

  /**
   * Create a new stock item
   */
  async createStock(data: CreateStockData): Promise<Stock> {
    // Map CreateStockData to StockData interface
    const stockData: Record<string, unknown> = {
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      storageType: data.storageType,
      imageUrl: data.imageUrl,
      backgroundColor: data.backgroundColor,
      x: data.x,
      y: data.y,
      scale: data.scale,
    };

    // Convert timestamp to Date if provided
    if (data.expirationDate !== undefined) {
      stockData.expiryDate = new Date(data.expirationDate);
    }

    return await this.stocks.create(stockData);
  }

  /**
   * Update an existing stock item
   */
  async updateStock(id: string, data: UpdateStockData): Promise<Stock | null> {
    // Cast to Record<string, unknown> to satisfy repository interface
    return await this.stocks.update(id, data);
  }

  /**
   * Delete a stock item
   */
  async deleteStock(id: string): Promise<void> {
    await this.stocks.delete(id);
  }

  /**
   * Search stock items
   */
  async searchStock(searchTerm?: string, options?: StockSearchOptions): Promise<Stock[]> {
    return await this.stocks.searchStock({
      searchTerm,
      ...options,
    });
  }

  /**
   * Get stock items expiring within configurable days
   * @param days - Number of days to look ahead (default: 3)
   * @returns Stock items that will expire within the specified days
   */
  async getExpiringStock(days: number = 3): Promise<Stock[]> {
    return await this.stocks.getExpiringSoonItems(days);
  }

  /**
   * Convert all stock units to a specific unit system
   */
  async convertUnits(toUnitSystem: "metric" | "imperial"): Promise<void> {
    try {
      const allStockItems = await this.stocks.findAll();
      log.info(`📦 Found ${allStockItems.length} stock items to convert`);

      if (allStockItems.length === 0) {
        log.info("ℹ️ No stock items to convert");
        return;
      }

      let convertedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Batch all updates in a single write to avoid flooding the write queue
      await database.write(async () => {
        for (const stockItem of allStockItems) {
          try {
            const converted = convertToUnitSystem(stockItem.quantity, stockItem.unit, toUnitSystem);

            const quantityChanged = Math.abs(converted.quantity - stockItem.quantity) > 0.001;
            const unitChanged = converted.unit !== stockItem.unit;

            if (quantityChanged || unitChanged) {
              await stockItem.update((record: any) => {
                record.quantity = roundToReasonablePrecision(converted.quantity);
                record.unit = converted.unit;
              });
              convertedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            log.warn(`⚠️ Failed to convert stock item ${stockItem.name}:`, error);
            errorCount++;
          }
        }
      });

      log.info(
        `✅ Conversion: ${convertedCount} converted, ${skippedCount} skipped, ${errorCount} errors`
      );
    } catch (error) {
      log.error(`❌ Error during unit conversion:`, error);
    }
  }

  // ============================================
  // COOKING HISTORY METHODS
  // ============================================

  /**
   * Record that a recipe was cooked
   */
  async recordCooking(recipeId: string, data?: RecordCookingData): Promise<CookingHistory> {
    return await this.cookingHistory.recordCooking(recipeId, data);
  }

  /**
   * Get cooking history (most recent first)
   */
  async getCookingHistory(limit?: number): Promise<CookingHistory[]> {
    return await this.cookingHistory.getCookingHistory({ limit });
  }

  /**
   * Get recently cooked recipes
   */
  async getRecentlyCookedRecipes(
    limit?: number
  ): Promise<Array<{ recipeId: string; lastCookedAt: number; cookCount: number }>> {
    return await this.cookingHistory.getRecentlyCookedRecipes(limit);
  }

  /**
   * Get most frequently cooked recipes
   */
  async getMostCookedRecipes(
    limit?: number
  ): Promise<Array<{ recipeId: string; cookCount: number; lastCookedAt: number }>> {
    return await this.cookingHistory.getMostCookedRecipes(limit);
  }

  /**
   * Get cook count for a specific recipe
   */
  async getRecipeCookCount(recipeId: string): Promise<number> {
    return await this.cookingHistory.getRecipeCookCount(recipeId);
  }

  /**
   * Update a cooking record
   */
  async updateCookingRecord(id: string, data: RecordCookingData): Promise<CookingHistory | null> {
    return await this.cookingHistory.updateCookingRecord(id, data);
  }

  /**
   * Delete a cooking record
   */
  async deleteCookingRecord(id: string): Promise<void> {
    await this.cookingHistory.delete(id);
  }

  // ============================================
  // ACHIEVEMENT METHODS
  // ============================================

  /**
   * Get all achievements from the local database
   */
  async getAchievements(options?: {
    type?: string;
    category?: string;
    hidden?: boolean;
  }): Promise<Achievement[]> {
    return await this.achievements.getAchievements(options);
  }

  /**
   * Get achievements by category
   */
  async getAchievementsByCategory(category: string): Promise<Achievement[]> {
    return await this.achievements.getAchievementsByCategory(category, false);
  }

  /**
   * Get visible (non-hidden) achievements
   */
  async getVisibleAchievements(): Promise<Achievement[]> {
    return await this.achievements.getVisibleAchievements();
  }

  /**
   * Get user's unlocked achievements
   */
  async getUnlockedAchievements(): Promise<UserAchievement[]> {
    return await this.userAchievements.getUnlockedAchievements();
  }

  /**
   * Get user's in-progress achievements
   */
  async getInProgressAchievements(): Promise<UserAchievement[]> {
    return await this.userAchievements.getInProgressAchievements();
  }

  /**
   * Get user's locked achievements
   */
  async getLockedAchievements(): Promise<UserAchievement[]> {
    return await this.userAchievements.getLockedAchievements();
  }

  /**
   * Unlock an achievement for the user
   */
  async unlockAchievement(achievementId: string): Promise<UserAchievement> {
    return await this.userAchievements.unlockAchievement(achievementId);
  }

  /**
   * Update progress for an achievement
   */
  async updateAchievementProgress(
    achievementId: string,
    progress: number
  ): Promise<UserAchievement> {
    return await this.userAchievements.updateProgress(achievementId, progress);
  }

  /**
   * Increment progress for an achievement
   */
  async incrementAchievementProgress(
    achievementId: string,
    amount: number = 1
  ): Promise<UserAchievement> {
    return await this.userAchievements.incrementProgress(achievementId, amount);
  }

  /**
   * Get user achievement for a specific achievement
   */
  async getUserAchievement(achievementId: string): Promise<UserAchievement | null> {
    return await this.userAchievements.getByAchievementId(achievementId);
  }

  /**
   * Get recently unlocked achievements
   */
  async getRecentlyUnlockedAchievements(limit: number = 10): Promise<UserAchievement[]> {
    return await this.userAchievements.getRecentlyUnlocked(limit);
  }

  /**
   * Get total XP earned from achievements
   */
  async getAchievementXPEarned(): Promise<number> {
    return await this.userAchievements.getTotalXPEarned();
  }

  // ============================================
  // CHALLENGE METHODS
  // ============================================

  /**
   * Get all challenges from the local database
   */
  async getChallenges(options?: {
    type?: string;
    active?: boolean;
    expired?: boolean;
    upcoming?: boolean;
  }): Promise<Challenge[]> {
    return await this.challenges.getChallenges(options);
  }

  /**
   * Get currently active challenges
   */
  async getActiveChallenges(): Promise<Challenge[]> {
    return await this.challenges.getActiveChallenges();
  }

  /**
   * Get daily challenges
   */
  async getDailyChallenges(): Promise<Challenge[]> {
    return await this.challenges.getDailyChallenges();
  }

  /**
   * Get weekly challenges
   */
  async getWeeklyChallenges(): Promise<Challenge[]> {
    return await this.challenges.getWeeklyChallenges();
  }

  /**
   * Get user's active challenges
   */
  async getUserActiveChallenges(): Promise<UserChallenge[]> {
    return await this.userChallenges.getActiveChallenges();
  }

  /**
   * Get user's completed challenges
   */
  async getUserCompletedChallenges(): Promise<UserChallenge[]> {
    return await this.userChallenges.getCompletedChallenges();
  }

  /**
   * Start a challenge for the user
   */
  async startChallenge(challengeId: string): Promise<UserChallenge> {
    return await this.userChallenges.startChallenge(challengeId);
  }

  /**
   * Update progress for a challenge
   */
  async updateChallengeProgress(challengeId: string, progress: number): Promise<UserChallenge> {
    return await this.userChallenges.updateProgress(challengeId, progress);
  }

  /**
   * Increment progress for a challenge
   */
  async incrementChallengeProgress(
    challengeId: string,
    amount: number = 1
  ): Promise<UserChallenge> {
    return await this.userChallenges.incrementProgress(challengeId, amount);
  }

  /**
   * Complete a challenge
   */
  async completeChallenge(challengeId: string): Promise<UserChallenge> {
    return await this.userChallenges.completeChallenge(challengeId);
  }

  /**
   * Claim rewards for a completed challenge
   */
  async claimChallengeRewards(challengeId: string): Promise<UserChallenge> {
    return await this.userChallenges.claimRewards(challengeId);
  }

  /**
   * Get user challenge for a specific challenge
   */
  async getUserChallenge(challengeId: string): Promise<UserChallenge | null> {
    return await this.userChallenges.getByChallengeId(challengeId);
  }

  /**
   * Get unclaimed completed challenges
   */
  async getUnclaimedChallenges(): Promise<UserChallenge[]> {
    return await this.userChallenges.getUnclaimedChallenges();
  }

  /**
   * Get total XP earned from challenges
   */
  async getChallengeXPEarned(): Promise<number> {
    return await this.userChallenges.getTotalXPEarned();
  }

  /**
   * Get challenges expiring soon (within 24 hours)
   */
  async getChallengesExpiringSoon(): Promise<Challenge[]> {
    return await this.challenges.getChallengesExpiringSoon();
  }

  // ============================================
  // WASTE LOG METHODS
  // ============================================

  /**
   * Record a waste log entry for discarded ingredients
   */
  async recordWaste(
    stockId: string,
    quantityWasted: number,
    data?: RecordWasteData
  ): Promise<WasteLog> {
    return await this.wasteLog.recordWaste(stockId, quantityWasted, {
      wasteDate: data?.wasteDate,
      reason: data?.reason,
      estimatedCost: data?.estimatedCost,
    });
  }

  /**
   * Get waste logs with optional filters
   */
  async getWasteLogs(options?: WasteLogSearchOptions): Promise<WasteLog[]> {
    return await this.wasteLog.getWasteLogs(options);
  }

  /**
   * Get waste statistics for a specific time period
   */
  async getWasteStats(startDate?: number, endDate?: number): Promise<WasteStats> {
    return await this.wasteLog.getWasteStats(startDate, endDate);
  }

  /**
   * Get waste data over time (grouped by day, week, or month)
   */
  async getWasteOverTime(
    startDate?: number,
    endDate?: number,
    groupBy: "day" | "week" | "month" = "day"
  ): Promise<WasteOverTimeData[]> {
    return await this.wasteLog.getWasteOverTime(startDate, endDate, groupBy);
  }

  /**
   * Get waste logs by specific reason
   */
  async getWasteByReason(reason: string): Promise<WasteLog[]> {
    return await this.wasteLog.getWasteByReason(reason);
  }

  /**
   * Get total waste cost for a period
   */
  async getTotalWasteCost(startDate?: number, endDate?: number): Promise<number> {
    return await this.wasteLog.getTotalWasteCost(startDate, endDate);
  }

  /**
   * Get most wasted items
   */
  async getMostWastedItems(
    limit?: number,
    startDate?: number,
    endDate?: number
  ): Promise<
    Array<{ stockId: string; wasteCount: number; totalQuantity: number; totalCost: number }>
  > {
    return await this.wasteLog.getMostWastedItems(limit, startDate, endDate);
  }

  /**
   * Get waste count for a specific stock item
   */
  async getStockWasteCount(stockId: string): Promise<number> {
    return await this.wasteLog.getStockWasteCount(stockId);
  }

  /**
   * Get total quantity wasted for a specific stock item
   */
  async getStockTotalWasteQuantity(stockId: string): Promise<number> {
    return await this.wasteLog.getStockTotalWasteQuantity(stockId);
  }

  /**
   * Delete waste logs for a specific stock item
   */
  async deleteWasteLogsByStockId(stockId: string): Promise<void> {
    await this.wasteLog.deleteByStockId(stockId);
  }

  /**
   * Get waste logs for a date range
   */
  async getWasteForDateRange(startDate: number, endDate: number): Promise<WasteLog[]> {
    return await this.wasteLog.getWasteForDateRange(startDate, endDate);
  }

  // ============================================
  // HIGH-LEVEL UTILITY METHODS
  // ============================================

  /**
   * Get recipes that can be made with current stock.
   *
   * Two-phase flow: (1) Load all active stock and batch-fetch synonyms and categories
   * (batch size 500 to avoid SQLite limits). (2) For each recipe, compute availability
   * using isIngredientMatch (see utils/ingredient-matching.ts) against pantry names
   * and synonym/category expansion. Returns canMake and partiallyCanMake with
   * completion percentages.
   */
  async getAvailableRecipes(): Promise<AvailableRecipesResult> {
    try {
      const allStock = await this.stocks.findAll();

      // Pre-fetch synonyms and categories for all stock items - Optimized to avoid N+1 queries
      const activeStock = allStock.filter((stock) => stock.quantity > 0);
      const activeStockIds = activeStock.map((s) => s.id);

      let allSynonyms: IngredientSynonym[] = [];
      let allStockCategories: StockCategory[] = [];

      if (activeStockIds.length > 0) {
        // Fetch synonyms in batches of 500 to avoid SQLite limits
        const synonymBatches: Promise<IngredientSynonym[]>[] = [];
        for (let i = 0; i < activeStockIds.length; i += 500) {
          const batchIds = activeStockIds.slice(i, i + 500);
          synonymBatches.push(
            database
              .get<IngredientSynonym>("ingredient_synonym")
              .query(Q.where("stock_id", Q.oneOf(batchIds)))
              .fetch()
          );
        }
        const synonymResults = await Promise.all(synonymBatches);
        allSynonyms = synonymResults.flat();

        // Fetch stock categories in batches
        const stockCategoryBatches: Promise<StockCategory[]>[] = [];
        for (let i = 0; i < activeStockIds.length; i += 500) {
          const batchIds = activeStockIds.slice(i, i + 500);
          stockCategoryBatches.push(
            database
              .get<StockCategory>("stock_category")
              .query(Q.where("stock_id", Q.oneOf(batchIds)))
              .fetch()
          );
        }
        const stockCategoryResults = await Promise.all(stockCategoryBatches);
        allStockCategories = stockCategoryResults.flat();
      }

      // Collect unique category IDs
      const categoryIds = [...new Set(allStockCategories.map((sc) => sc.categoryId))];

      let allCategories: IngredientCategory[] = [];
      if (categoryIds.length > 0) {
        // Fetch categories in batches
        const categoryBatches: Promise<IngredientCategory[]>[] = [];
        for (let i = 0; i < categoryIds.length; i += 500) {
          const batchIds = categoryIds.slice(i, i + 500);
          categoryBatches.push(
            database
              .get<IngredientCategory>("ingredient_category")
              .query(Q.where("id", Q.oneOf(batchIds)))
              .fetch()
          );
        }
        const categoryResults = await Promise.all(categoryBatches);
        allCategories = categoryResults.flat();
      }

      // Create lookup maps
      const synonymsByStockId = new Map<string, string[]>();
      allSynonyms.forEach((syn) => {
        if (!synonymsByStockId.has(syn.stockId)) {
          synonymsByStockId.set(syn.stockId, []);
        }
        synonymsByStockId.get(syn.stockId)?.push(syn.synonym);
      });

      const categoryNameMap = new Map<string, string>();
      allCategories.forEach((cat) => categoryNameMap.set(cat.id, cat.name));

      const categoriesByStockId = new Map<string, string[]>();
      allStockCategories.forEach((sc) => {
        const categoryName = categoryNameMap.get(sc.categoryId);
        if (categoryName) {
          if (!categoriesByStockId.has(sc.stockId)) {
            categoriesByStockId.set(sc.stockId, []);
          }
          categoriesByStockId.get(sc.stockId)?.push(categoryName);
        }
      });

      const pantryItemsWithMetadata = activeStock.map((stock) => {
        const synonyms = synonymsByStockId.get(stock.id) || [];
        const categories = categoriesByStockId.get(stock.id) || [];

        return {
          name: stock.name,
          synonyms: [...synonyms, ...categories],
        };
      });

      const allRecipes = await this.recipes.findAll();

      const canMake: Recipe[] = [];
      const partiallyCanMake: {
        recipe: Recipe;
        completionPercentage: number;
      }[] = [];

      // Process recipes in batches
      const batchSize = 100;

      for (let i = 0; i < allRecipes.length; i += batchSize) {
        const recipeBatch = allRecipes.slice(i, i + batchSize);

        const recipeIds = recipeBatch.map((recipe) => recipe.id);
        const batchDetailsMap = await this.getRecipesWithDetails(recipeIds);

        for (let j = 0; j < recipeBatch.length; j++) {
          const recipe = recipeBatch[j];
          if (!recipe) continue;

          const recipeDetails = batchDetailsMap.get(recipe.id);

          if (!recipeDetails || !recipeDetails.ingredients.length) {
            continue;
          }

          let availableCount = 0;
          for (const ingredient of recipeDetails.ingredients) {
            const matchingItem = pantryItemsWithMetadata.find((pantryItem) =>
              isIngredientMatch(pantryItem.name, ingredient.name, pantryItem.synonyms)
            );

            if (matchingItem) {
              availableCount++;
            }
          }

          const totalCount = recipeDetails.ingredients.length;
          const percentage = Math.round((availableCount / totalCount) * 100);

          if (availableCount === totalCount && totalCount > 0 && recipe) {
            canMake.push(recipe);
          } else if (availableCount > 0 && recipe) {
            partiallyCanMake.push({
              recipe,
              completionPercentage: percentage,
            });
          }
        }
      }

      return {
        canMake,
        partiallyCanMake: partiallyCanMake.sort(
          (a, b) => b.completionPercentage - a.completionPercentage
        ),
      };
    } catch (error) {
      log.error("❌ Error in getAvailableRecipes:", error);
      return { canMake: [], partiallyCanMake: [] };
    }
  }

  /**
   * Get shopping list for a recipe
   */
  async getShoppingListForRecipe(recipeId: string): Promise<ShoppingListResult> {
    const recipeDetails = await this.recipes.getRecipeWithDetails(recipeId);
    if (!recipeDetails) {
      return { missingIngredients: [], availableIngredients: [] };
    }

    const missingIngredients: ShoppingListResult["missingIngredients"] = [];
    const availableIngredients: ShoppingListResult["availableIngredients"] = [];

    // Gather all ingredient names to query them simultaneously
    const ingredientNames = recipeDetails.ingredients.map((ing) => ing.name);

    // Fetch matching stock items at once to avoid N+1 queries in the loop below
    const matchingStocks = await this.stocks.getStocksByNamesOrSynonyms(ingredientNames);

    for (const ingredient of recipeDetails.ingredients) {
      // Filter the specific stock items for this ingredient from the pre-fetched list
      const stockItems = matchingStocks.filter((stock) =>
        isIngredientMatch(stock.name, ingredient.name, stock.synonyms)
      );

      // Note: getStocksByNamesOrSynonyms returns an array of plain objects, not Stock models,
      // so we use any/type inference for the reduction.
      const totalStock = stockItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

      if (totalStock === 0) {
        missingIngredients.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
        });
      } else {
        const firstStockItem = stockItems[0];
        availableIngredients.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          stockQuantity: totalStock,
          stockUnit: firstStockItem?.unit || "",
        });
      }
    }

    return {
      missingIngredients,
      availableIngredients,
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const [recipes, stockItems, cookingHistory] = await Promise.all([
      this.recipes.count(),
      this.stocks.count(),
      this.cookingHistory.count(),
    ]);

    return {
      recipes,
      stockItems,
      cookingHistory,
      totalRecords: recipes + stockItems + cookingHistory,
    };
  }

  /**
   * Clear all recipes and related cooking history from the database
   */
  async clearRecipes(): Promise<void> {
    if (!database) {
      throw new Error("Database is not initialized");
    }

    const collections = ["recipe", "recipe_step", "recipe_ingredient", "cooking_history"];

    // Batch all deletions in a single write to avoid flooding the write queue
    await database.write(async () => {
      for (const collectionName of collections) {
        try {
          const collection = database.collections.get(collectionName);
          const allRecords = await collection.query().fetch();

          if (allRecords.length > 0) {
            await Promise.all(allRecords.map((record) => record.destroyPermanently()));
          }
        } catch (error) {
          log.warn(`⚠️ Error clearing ${collectionName}:`, error);
        }
      }
    });
  }

  /**
   * Clear all data from the database
   */
  async clearAllData(): Promise<void> {
    if (!database) {
      throw new Error("Database is not initialized");
    }

    const collections = [
      "recipe",
      "recipe_step",
      "recipe_ingredient",
      "stock",
      "steps_to_store",
      "cooking_history",
    ];

    // Batch all deletions in a single write to avoid flooding the write queue
    await database.write(async () => {
      for (const collectionName of collections) {
        try {
          const collection = database.collections.get(collectionName);
          const allRecords = await collection.query().fetch();

          if (allRecords.length > 0) {
            await Promise.all(allRecords.map((record) => record.destroyPermanently()));
          }
        } catch (error) {
          log.warn(`⚠️ Error clearing ${collectionName}:`, error);
        }
      }
    });
  }

  /**
   * Export all data from the database
   */
  async exportAllData(): Promise<{
    recipes: unknown[];
    stock: unknown[];
    cookingHistory: unknown[];
  }> {
    const [recipes, stockItems, cookingHistory] = await Promise.all([
      this.recipes.findAll(),
      this.stocks.findAll(),
      this.cookingHistory.findAll(),
    ]);

    return {
      recipes: recipes.map((r) => r._raw),
      stock: stockItems.map((s) => s._raw),
      cookingHistory: cookingHistory.map((c) => c._raw),
    };
  }

  /**
   * Health check method for debugging
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (
        !this.recipes ||
        !this.stocks ||
        !this.cookingHistory ||
        !this.achievements ||
        !this.userAchievements ||
        !this.challenges ||
        !this.userChallenges
      ) {
        return false;
      }

      const recipeCount = await this.recipes.count();
      return recipeCount >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Get raw database instance (for advanced operations only)
   */
  getDatabase() {
    return database;
  }
}

// Export a singleton instance
export const databaseFacade = new DatabaseFacade();

// Export for type usage
export default DatabaseFacade;
