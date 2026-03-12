import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "./RecipeRankingStrategy";

interface WeightedStrategy {
  strategy: RecipeRankingStrategy;
  weight: number;
}

/**
 * Composite strategy that combines multiple ranking strategies with configurable weights.
 * 
 * The final score is the sum of all weighted strategy scores:
 * totalScore = Σ(strategy.score(recipe) * weight)
 * 
 * @example
 * const composite = new CompositeRankingStrategy()
 *   .addStrategy(new DifficultyStrategy(), 1)
 *   .addStrategy(new TimeStrategy(), 1)
 *   .addStrategy(new CookingHistoryStrategy(), 1.5);
 */
export class CompositeRankingStrategy implements RecipeRankingStrategy {
  private strategies: WeightedStrategy[] = [];

  /**
   * Add a strategy with an optional weight
   * @param strategy The ranking strategy to add
   * @param weight Weight multiplier for this strategy's score (default: 1)
   * @returns this for method chaining
   */
  addStrategy(strategy: RecipeRankingStrategy, weight: number = 1): this {
    this.strategies.push({ strategy, weight });
    return this;
  }

  /**
   * Remove all strategies
   * @returns this for method chaining
   */
  clear(): this {
    this.strategies = [];
    return this;
  }

  /**
   * Get the number of strategies in this composite
   */
  get strategyCount(): number {
    return this.strategies.length;
  }

  /**
   * Calculate the combined weighted score for a recipe
   * @param recipe The recipe to score
   * @param context Optional context passed to all strategies
   * @returns Sum of all weighted strategy scores
   */
  score(recipe: Recipe, context?: RankingContext): number {
    return this.strategies.reduce((total, { strategy, weight }) => {
      return total + strategy.score(recipe, context) * weight;
    }, 0);
  }
}
