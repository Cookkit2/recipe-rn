// Types and interfaces
export type {
  RecipeRankingStrategy,
  RankingContext,
  CookingHistoryData,
} from "./RecipeRankingStrategy";

// Composite strategy
export { CompositeRankingStrategy } from "./CompositeRankingStrategy";

// Individual strategies
export { DifficultyStrategy } from "./strategies/DifficultyStrategy";
export { TimeStrategy } from "./strategies/TimeStrategy";
export { DietaryStrategy } from "./strategies/DietaryStrategy";
export { RandomVarietyStrategy } from "./strategies/RandomVarietyStrategy";

// Cooking history-based strategies
export {
  FamiliarityStrategy,
  type FamiliarityStrategyOptions,
} from "./strategies/FamiliarityStrategy";
export {
  RecencyPenaltyStrategy,
  type RecencyPenaltyStrategyOptions,
} from "./strategies/RecencyPenaltyStrategy";
export {
  UserRatingStrategy,
  type UserRatingStrategyOptions,
} from "./strategies/UserRatingStrategy";

// Pantry/availability-based strategies
export { ReadinessStrategy, type ReadinessStrategyOptions } from "./strategies/ReadinessStrategy";
export {
  ExpiringIngredientsRankingStrategy,
  type ExpiringIngredientsRankingStrategyOptions,
} from "./strategies/ExpiringIngredientsRankingStrategy";

// Sorting strategies
export {
  AlphabeticalStrategy,
  type AlphabeticalStrategyOptions,
} from "./strategies/AlphabeticalStrategy";

// Factory functions
import { CompositeRankingStrategy } from "./CompositeRankingStrategy";
import { DifficultyStrategy } from "./strategies/DifficultyStrategy";
import { TimeStrategy } from "./strategies/TimeStrategy";
import { DietaryStrategy } from "./strategies/DietaryStrategy";
import { RandomVarietyStrategy } from "./strategies/RandomVarietyStrategy";
import { RecencyPenaltyStrategy } from "./strategies/RecencyPenaltyStrategy";

/**
 * Create the default ranking strategy (backward compatible with original behavior)
 *
 * Includes: Difficulty, Time, Dietary, RandomVariety
 */
export function createDefaultRankingStrategy(): CompositeRankingStrategy {
  return new CompositeRankingStrategy()
    .addStrategy(new DifficultyStrategy(), 1)
    .addStrategy(new TimeStrategy(), 1)
    .addStrategy(new DietaryStrategy(), 1)
    .addStrategy(new RandomVarietyStrategy(), 1);
}

/**
 * Create a ranking strategy that incorporates cooking history
 *
 * Includes: Difficulty, Time, Dietary, Familiarity, RecencyPenalty, UserRating, RandomVariety
 *
 * Note: Requires cookingHistory data in RankingContext for history-based scoring
 */
export function createHistoryAwareRankingStrategy(): CompositeRankingStrategy {
  return new CompositeRankingStrategy()
    .addStrategy(new DifficultyStrategy(), 1)
    .addStrategy(new TimeStrategy(), 1)
    .addStrategy(new DietaryStrategy(), 1)
    .addStrategy(new RecencyPenaltyStrategy(), 2);
  // .addStrategy(new FamiliarityStrategy(), 1.5)
  // .addStrategy(new UserRatingStrategy(), 1.5)
}

/**
 * Create a simple ranking strategy focused only on ease of cooking
 *
 * Includes: Difficulty (2x weight), Time (2x weight)
 */
export function createQuickAndEasyRankingStrategy(): CompositeRankingStrategy {
  return new CompositeRankingStrategy()
    .addStrategy(new DifficultyStrategy(), 2)
    .addStrategy(new TimeStrategy(), 2);
}
