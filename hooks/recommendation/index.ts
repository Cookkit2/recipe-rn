// =============================================================================
// Recommendation Module
// =============================================================================
// This module provides recipe recommendation functionality through two submodules:
// - filters: For including/excluding recipes based on criteria
// - ranking: For scoring and ordering recipes by relevance
// =============================================================================

// -----------------------------------------------------------------------------
// Filtering Submodule
// -----------------------------------------------------------------------------
// Types
export type { RecipeFilterStrategy, FilterContext } from "./filters";

// Composite filter
export { CompositeFilterStrategy } from "./filters";

// Individual filters
export {
  AvailabilityFilter,
  type AvailabilityFilterOptions,
  CategoryFilter,
  type CategoryFilterOptions,
  DietaryFilter,
  type DietaryFilterOptions,
} from "./filters";

// -----------------------------------------------------------------------------
// Ranking Submodule
// -----------------------------------------------------------------------------
// Types
export type { RecipeRankingStrategy, RankingContext, CookingHistoryData } from "./ranking";

// Composite strategy
export { CompositeRankingStrategy } from "./ranking";

// Individual strategies
export {
  DifficultyStrategy,
  TimeStrategy,
  DietaryStrategy,
  RandomVarietyStrategy,
} from "./ranking";

// Cooking history-based strategies
export {
  FamiliarityStrategy,
  type FamiliarityStrategyOptions,
  RecencyPenaltyStrategy,
  type RecencyPenaltyStrategyOptions,
  UserRatingStrategy,
  type UserRatingStrategyOptions,
} from "./ranking";

// Pantry/availability-based strategies
export {
  ReadinessStrategy,
  type ReadinessStrategyOptions,
  ExpiringIngredientsRankingStrategy,
  type ExpiringIngredientsRankingStrategyOptions,
} from "./ranking";

// Sorting strategies
export { AlphabeticalStrategy, type AlphabeticalStrategyOptions } from "./ranking";

// Factory functions
export {
  createDefaultRankingStrategy,
  createHistoryAwareRankingStrategy,
  createQuickAndEasyRankingStrategy,
} from "./ranking";
