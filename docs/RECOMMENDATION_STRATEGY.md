# Recipe Recommendation Strategy

A flexible, composable strategy pattern implementation for recipe recommendations. The system uses a two-phase approach: **filtering** (which recipes to show) and **ranking** (how to order them).

## Overview

The Recommendation module (`hooks/recommendation/`) provides two complementary strategy patterns:

| Phase         | Purpose                                   | Interface               | Composite                  |
| ------------- | ----------------------------------------- | ----------------------- | -------------------------- |
| **Filtering** | Include/exclude recipes based on criteria | `RecipeFilterStrategy`  | `CompositeFilterStrategy`  |
| **Ranking**   | Score and sort filtered recipes           | `RecipeRankingStrategy` | `CompositeRankingStrategy` |

Both use the **composite design pattern**, allowing individual strategies to be combined for customized behavior. The typical flow is:

```
All Recipes → Filter Phase → Filtered Recipes → Ranking Phase → Sorted Results
```

## Architecture

```
hooks/recommendation/
├── index.ts                            # Barrel exports (exposes both submodules)
├── filters/                            # Filtering submodule
│   ├── index.ts                        # Filter exports
│   ├── RecipeFilterStrategy.ts         # Filter interface + types
│   ├── CompositeFilterStrategy.ts      # Combines filters (AND/OR logic)
│   ├── AvailabilityFilter.ts           # Filter by ingredient availability
│   ├── CategoryFilter.ts               # Filter by tags/categories
│   └── DietaryFilter.ts                # Filter by dietary preferences
└── ranking/                            # Ranking submodule
    ├── index.ts                        # Ranking exports + factory functions
    ├── RecipeRankingStrategy.ts        # Ranking interface + types
    ├── CompositeRankingStrategy.ts     # Combines ranking strategies with weights
    └── strategies/                     # Individual ranking strategies
        ├── DifficultyStrategy.ts       # Easier recipes score higher
        ├── TimeStrategy.ts             # Shorter recipes score higher
        ├── DietaryStrategy.ts          # Dietary preference match boost
        ├── RandomVarietyStrategy.ts    # Random factor for variety
        ├── FamiliarityStrategy.ts      # Boost for previously cooked recipes
        ├── RecencyPenaltyStrategy.ts   # Penalize recently cooked recipes
        ├── UserRatingStrategy.ts       # Boost for highly rated recipes
        ├── ReadinessStrategy.ts        # Score by ingredient availability
        └── AlphabeticalStrategy.ts     # Alphabetical title sorting
```

## Core Concepts

### RecipeRankingStrategy Interface

All strategies implement this interface:

```typescript
interface RecipeRankingStrategy {
  score(recipe: Recipe, context?: RankingContext): number;
}
```

### RankingContext

Context passed to strategies containing additional data:

```typescript
interface RankingContext {
  cookingHistory?: CookingHistoryData;
  completionPercentages?: Map<string, number>; // recipeId -> 0-100%
}

interface CookingHistoryData {
  mostCooked: Map<string, { cookCount: number; lastCookedAt: number }>;
  ratings: Map<string, number>; // recipeId -> average rating
}
```

### CompositeRankingStrategy

Combines multiple strategies with configurable weights:

```typescript
const composite = new CompositeRankingStrategy()
  .addStrategy(new DifficultyStrategy(), 1)
  .addStrategy(new TimeStrategy(), 2) // Double weight
  .addStrategy(new UserRatingStrategy(), 1.5);

const score = composite.score(recipe, context);
// Result: sum of (strategy.score * weight) for all strategies
```

## Filter Strategies

Filters determine **which recipes to include** in results. They return `true` (include) or `false` (exclude).

### RecipeFilterStrategy Interface

All filters implement this interface:

```typescript
interface RecipeFilterStrategy {
  filter(recipe: Recipe, context?: FilterContext): boolean;
}

interface FilterContext {
  completionPercentages?: Map<string, number>; // recipeId -> 0-100%
  selectedCategories?: string[]; // Dynamic category selection
}
```

### Available Filters

| Filter               | Description                               | Configuration                               |
| -------------------- | ----------------------------------------- | ------------------------------------------- |
| `AvailabilityFilter` | Filter by ingredient availability         | `minAvailability`, `maxAvailability`        |
| `CategoryFilter`     | Filter by tags/categories                 | `categories`, `requireAll`                  |
| `DietaryFilter`      | Filter by dietary preferences & allergens | `checkDietaryPreferences`, `checkAllergens` |

### CompositeFilterStrategy

Combines multiple filters with **AND** or **OR** logic using the composite pattern:

```typescript
// AND logic (default) - recipe must pass ALL filters
const filter = new CompositeFilterStrategy()
  .addFilter(new AvailabilityFilter({ minAvailability: 50 }))
  .addFilter(new CategoryFilter({ categories: ["meal"] }))
  .addFilter(new DietaryFilter());

// OR logic - recipe must pass ANY filter
const orFilter = new CompositeFilterStrategy(true)
  .addFilter(new CategoryFilter({ categories: ["quick"] }))
  .addFilter(new AvailabilityFilter({ minAvailability: 100 }));
```

### Filter Implementation Details

#### AvailabilityFilter

Filters recipes based on ingredient availability percentage.

```typescript
new AvailabilityFilter({
  minAvailability?: number,  // Default: 0 (include all)
  maxAvailability?: number,  // Default: 100
})
```

**Implementation:**

- Requires `completionPercentages` map in `FilterContext`
- Returns `true` if recipe's completion % is within the specified range
- Returns `true` by default if no completion data available

```typescript
// Example: Only show recipes where user has at least 50% of ingredients
new AvailabilityFilter({ minAvailability: 50 });

// Example: Show recipes missing some ingredients (for shopping suggestions)
new AvailabilityFilter({ minAvailability: 0, maxAvailability: 99 });
```

#### CategoryFilter

Filters recipes by their tags/categories.

```typescript
new CategoryFilter({
  categories?: string[],  // Categories to match (or use context.selectedCategories)
  requireAll?: boolean,   // Default: false (ANY category matches)
})
```

**Implementation:**

- Can use categories from constructor options OR from `FilterContext.selectedCategories`
- Case-insensitive matching against recipe tags
- `requireAll: false` (default) = recipe needs ANY matching tag
- `requireAll: true` = recipe needs ALL specified tags
- Returns `true` if no categories specified (passes all)

```typescript
// Example: Show meals OR desserts
new CategoryFilter({ categories: ["meal", "dessert"] });

// Example: Must be both vegetarian AND quick
new CategoryFilter({ categories: ["vegetarian", "quick"], requireAll: true });
```

#### DietaryFilter

Filters recipes based on user's dietary preferences and allergens stored in app storage.

```typescript
new DietaryFilter({
  checkDietaryPreferences?: boolean,  // Default: true
  checkAllergens?: boolean,           // Default: true
})
```

**Implementation:**

- Reads from storage keys: `PREF_DIET_KEY`, `PREF_ALLERGENS_KEY`, `PREF_OTHER_ALLERGENS_KEY`
- **Dietary check**: Recipe must have a tag matching user's diet (vegetarian, vegan, etc.)
- **Allergen check**: Recipe ingredients are scanned for allergen keywords
- Supports both standard allergens (milk, eggs, nuts, fish, shellfish, wheat) and custom allergens

```typescript
// Example: Apply both dietary and allergen filtering
new DietaryFilter();

// Example: Only check allergens, allow any diet
new DietaryFilter({ checkDietaryPreferences: false });
```

**Allergen Detection:**
The filter checks ingredient names for allergen-related terms:

- `milk` → milk, dairy, cheese, butter, cream, yogurt, lactose
- `eggs` → egg, mayonnaise, mayo
- `nuts` → nut, almond, walnut, pecan, cashew, pistachio, hazelnut, macadamia
- `fish` → fish, salmon, tuna, cod, anchovy, sardine
- `shellfish` → shrimp, crab, lobster, prawn, scallop, oyster, mussel
- `wheat` → wheat, flour, gluten, bread, pasta, noodle, soy sauce

## Ranking Strategies

Ranking strategies determine **how to order** the filtered recipes. Each strategy returns a numeric score; higher scores = better ranking.

### Basic Strategies

| Strategy                | Description                       | Default Score Range        |
| ----------------------- | --------------------------------- | -------------------------- |
| `DifficultyStrategy`    | Easier recipes score higher       | 10-50 (based on 1-5 stars) |
| `TimeStrategy`          | Shorter total time scores higher  | 0-12 (under 2 hours)       |
| `DietaryStrategy`       | Matches user's dietary preference | 0 or +50                   |
| `RandomVarietyStrategy` | Random factor for variety         | 0-20                       |

### Cooking History Strategies

These require `cookingHistory` data in the `RankingContext`:

| Strategy                 | Description                       | Default Score           |
| ------------------------ | --------------------------------- | ----------------------- |
| `FamiliarityStrategy`    | Boosts previously cooked recipes  | +15 (1-2x), +25 (3+x)   |
| `RecencyPenaltyStrategy` | Penalizes recently cooked recipes | -20 (within 3 days)     |
| `UserRatingStrategy`     | Boosts highly rated recipes       | +30 (if rated 4+ stars) |

### Pantry/Availability Strategies

These require `completionPercentages` data in the `RankingContext`:

| Strategy            | Description                       | Default Score             |
| ------------------- | --------------------------------- | ------------------------- |
| `ReadinessStrategy` | Scores by ingredient availability | 0-100 + 50 bonus for 100% |

### Sorting Strategies

| Strategy               | Description                      | Default Score              |
| ---------------------- | -------------------------------- | -------------------------- |
| `AlphabeticalStrategy` | Alphabetical title sorting (A-Z) | 0-26 based on first letter |

## Factory Functions

Pre-configured composite strategies for common use cases:

### createDefaultRankingStrategy()

Original behavior without cooking history:

```typescript
new CompositeRankingStrategy()
  .addStrategy(new DifficultyStrategy(), 1)
  .addStrategy(new TimeStrategy(), 1)
  .addStrategy(new DietaryStrategy(), 1)
  .addStrategy(new RandomVarietyStrategy(), 1);
```

### createHistoryAwareRankingStrategy()

Includes cooking history factors (default):

```typescript
new CompositeRankingStrategy()
  .addStrategy(new DifficultyStrategy(), 1)
  .addStrategy(new TimeStrategy(), 1)
  .addStrategy(new DietaryStrategy(), 1)
  .addStrategy(new RecencyPenaltyStrategy(), 1.5)
  .addStrategy(new RandomVarietyStrategy(), 0.5);
```

### createQuickAndEasyRankingStrategy()

Focus on ease of cooking:

```typescript
new CompositeRankingStrategy()
  .addStrategy(new DifficultyStrategy(), 2)
  .addStrategy(new TimeStrategy(), 2);
```

## Usage

### Basic Usage (Auto-fetches cooking history)

```typescript
import { recipeApi } from "~/data/api/recipeApi";

// Uses createHistoryAwareRankingStrategy() by default
// Cooking history is auto-fetched internally
const recommendations = await recipeApi.getRecipeRecommendations();
```

### Custom Strategy

```typescript
import {
  CompositeRankingStrategy,
  DifficultyStrategy,
  FamiliarityStrategy,
  UserRatingStrategy,
} from "~/hooks/recommendation";

const customStrategy = new CompositeRankingStrategy()
  .addStrategy(new DifficultyStrategy(), 1)
  .addStrategy(new FamiliarityStrategy(), 3) // Heavy familiarity weight
  .addStrategy(new UserRatingStrategy(), 2);

const recommendations = await recipeApi.getRecipeRecommendations({
  rankingStrategy: customStrategy,
});
```

### Pre-fetched Context

```typescript
import type { CookingHistoryData } from "~/hooks/recommendation";

// Pre-fetch data (useful for performance optimization)
const cookingHistory: CookingHistoryData = {
  mostCooked: new Map([["recipe-1", { cookCount: 5, lastCookedAt: Date.now() - 86400000 }]]),
  ratings: new Map([["recipe-1", 4.5]]),
};

const recommendations = await recipeApi.getRecipeRecommendations({
  rankingContext: { cookingHistory },
});
```

## Strategy Configuration

Each strategy accepts configuration options:

### DifficultyStrategy

```typescript
new DifficultyStrategy(multiplier: number = 10)
// Score: (6 - difficultyStars) * multiplier
```

### TimeStrategy

```typescript
new TimeStrategy(maxTimeForBonus: number = 120, divisor: number = 10)
// Score: max(0, maxTimeForBonus - totalMinutes) / divisor
```

### DietaryStrategy

```typescript
new DietaryStrategy(matchBonus: number = 50)
// Score: matchBonus if dietary preference matches, 0 otherwise
```

### RandomVarietyStrategy

```typescript
new RandomVarietyStrategy(maxVariety: number = 20)
// Score: random value between 0 and maxVariety
```

### FamiliarityStrategy

```typescript
new FamiliarityStrategy({
  bonusLow?: number,      // Default: 15 (for 1-2 cooks)
  bonusHigh?: number,     // Default: 25 (for 3+ cooks)
  highThreshold?: number, // Default: 3
})
```

### RecencyPenaltyStrategy

```typescript
new RecencyPenaltyStrategy({
  penalty?: number,       // Default: -20
  daysThreshold?: number, // Default: 3
})
```

### UserRatingStrategy

```typescript
new UserRatingStrategy({
  highRatingBonus?: number,   // Default: 30
  minRatingForBonus?: number, // Default: 4
})
```

### ReadinessStrategy

```typescript
new ReadinessStrategy({
  multiplier?: number,        // Default: 1 (score = completion% * multiplier)
  fullReadinessBonus?: number, // Default: 50 (extra bonus for 100%)
})
// Score: (completion% * multiplier) + fullReadinessBonus if 100%
```

### AlphabeticalStrategy

```typescript
new AlphabeticalStrategy({
  descending?: boolean, // Default: false (A-Z). Set true for Z-A
  maxScore?: number,    // Default: 26
})
// Score: 26 for 'A', 25 for 'B', ... 1 for 'Z' (ascending)
```

## Creating Custom Strategies

### Custom Ranking Strategy

Implement the `RecipeRankingStrategy` interface:

```typescript
import type { Recipe } from "~/types/Recipe";
import type { RecipeRankingStrategy, RankingContext } from "~/hooks/recommendation";

export class CalorieStrategy implements RecipeRankingStrategy {
  private readonly maxCalories: number;
  private readonly bonus: number;

  constructor(maxCalories: number = 500, bonus: number = 20) {
    this.maxCalories = maxCalories;
    this.bonus = bonus;
  }

  score(recipe: Recipe, _context?: RankingContext): number {
    if (recipe.calories && recipe.calories <= this.maxCalories) {
      return this.bonus;
    }
    return 0;
  }
}

// Usage
const healthyStrategy = new CompositeRankingStrategy()
  .addStrategy(new CalorieStrategy(400), 2)
  .addStrategy(new DifficultyStrategy(), 1);
```

### Custom Filter Strategy

Implement the `RecipeFilterStrategy` interface:

```typescript
import type { Recipe } from "~/types/Recipe";
import type { RecipeFilterStrategy, FilterContext } from "~/hooks/recommendation";

export interface PrepTimeFilterOptions {
  maxPrepMinutes?: number;
}

export class PrepTimeFilter implements RecipeFilterStrategy {
  private readonly maxPrepMinutes: number;

  constructor(options: PrepTimeFilterOptions = {}) {
    this.maxPrepMinutes = options.maxPrepMinutes ?? 30;
  }

  filter(recipe: Recipe, _context?: FilterContext): boolean {
    // Include recipes with prep time under the threshold
    const prepTime = recipe.prepMinutes ?? 0;
    return prepTime <= this.maxPrepMinutes;
  }
}

// Usage
const quickMealsFilter = new CompositeFilterStrategy()
  .addFilter(new PrepTimeFilter({ maxPrepMinutes: 15 }))
  .addFilter(new CategoryFilter({ categories: ["meal"] }));
```

### Combining Filters and Ranking

```typescript
import {
  CompositeFilterStrategy,
  CompositeRankingStrategy,
  CategoryFilter,
  AvailabilityFilter,
  DietaryFilter,
  ReadinessStrategy,
  DifficultyStrategy,
} from "~/hooks/recommendation";

// Step 1: Filter - decide which recipes to include
const filterStrategy = new CompositeFilterStrategy()
  .addFilter(new CategoryFilter({ categories: ["meal"] }))
  .addFilter(new AvailabilityFilter({ minAvailability: 50 }))
  .addFilter(new DietaryFilter());

// Step 2: Rank - decide the order
const rankingStrategy = new CompositeRankingStrategy()
  .addStrategy(new ReadinessStrategy(), 2) // Prioritize available ingredients
  .addStrategy(new DifficultyStrategy(), 1); // Then easier recipes

// Use with hook
const { recipes } = useRecipeRecommendations({
  filterStrategy,
  rankingStrategy,
});
```

## Integration with useRecipeRecommendations

The `useRecipeRecommendations` hook supports both filtering and ranking:

```typescript
interface UseRecipeRecommendationsOptions {
  maxRecommendations?: number; // Limit results
  categories?: string[]; // Filter by tags
  filterStrategy?: RecipeFilterStrategy; // Custom filter (use DietaryFilter for dietary preferences)
  rankingStrategy?: RecipeRankingStrategy; // Custom ranking (defaults to history-aware)
}
```

### Basic Usage (recommendations only)

```typescript
const { recipes } = useRecipeRecommendations({
  categories: ["meal"],
});
// Returns: { recipes: RecipeWithCompletion[] }
```

### With Filtering and Ranking

```typescript
import {
  CompositeFilterStrategy,
  CategoryFilter,
  CompositeRankingStrategy,
  ReadinessStrategy,
  AlphabeticalStrategy,
} from "~/hooks/recommendation";

const filterStrategy = new CompositeFilterStrategy().addFilter(
  new CategoryFilter({ categories: ["meal"] })
);

const rankingStrategy = new CompositeRankingStrategy()
  .addStrategy(new ReadinessStrategy(), 2)
  .addStrategy(new AlphabeticalStrategy(), 0.1);

const { recipes, isLoading, error } = useRecipeRecommendations({
  filterStrategy,
  rankingStrategy,
});
// Returns: { recipes: RecipeWithCompletion[], isLoading, error }
```

## Integration with recipeApi

The `recipeApi.getRecipeRecommendations()` method handles filtering and ranking:

```typescript
interface RecommendationOptions {
  maxRecommendations?: number;
  categories?: string[];
  filterStrategy?: RecipeFilterStrategy; // Apply custom filtering
  rankingStrategy?: RecipeRankingStrategy;
  rankingContext?: RankingContext;
  // Performance optimization: pre-fetched data (optional)
  preFetchedAvailability?: AvailableRecipesResult;
  preFetchedCookingHistory?: CookingHistoryData;
}
```

**Return value:**
Returns `{ recipes: RecipeWithCompletion[] }` - a unified list filtered and ranked.

**Pre-fetched data parameters (optimization):**
When `preFetchedAvailability` or `preFetchedCookingHistory` are provided, the method uses them directly instead of fetching from the database. This is used by `useRecipeRecommendations` to avoid redundant database calls when data is already cached by React Query.

**Auto-fetched data (fallback):**
When pre-fetched data is NOT provided, the method auto-fetches:

- `getAvailableRecipes()` for ingredient availability data
- `getMostCookedRecipes(100)` for cook counts and timestamps
- `getCookingHistory(500)` for user ratings

## Caching Strategy

The `useRecipeRecommendations` hook uses an optimized caching strategy to avoid fetching all data on every render. Instead of fetching everything fresh, it composes from multiple cached queries:

```typescript
// Separate cached queries (different cache lifetimes)
const availabilityQuery = useQuery({
  queryKey: recipeQueryKeys.available(),
  queryFn: () => databaseFacade.getAvailableRecipes(),
  staleTime: 1 * 60 * 1000, // 1 minute - depends on pantry
});

const mostCookedQuery = useQuery({
  queryKey: ["cookingHistory", "mostCooked", 100],
  queryFn: () => databaseFacade.getMostCookedRecipes(100),
  staleTime: 2 * 60 * 1000, // 2 minutes
});

const cookingHistoryQuery = useQuery({
  queryKey: ["cookingHistory", "list", 500],
  queryFn: () => databaseFacade.getCookingHistory(500),
  staleTime: 1 * 60 * 1000, // 1 minute
});

// Recommendations query uses cached data above
const recommendationsQuery = useQuery({
  queryKey: ["recipes", "recommendations", categories, ...],
  queryFn: async () => {
    // Pass cached data to API to avoid redundant fetches
    return recipeApi.getRecipeRecommendations({
      preFetchedAvailability: availabilityQuery.data,
      preFetchedCookingHistory: cookingHistoryData,
      // ... other options
    });
  },
  enabled: !!availabilityQuery.data && !!mostCookedQuery.data && !!cookingHistoryQuery.data,
  staleTime: 30 * 1000, // 30 seconds
});
```

**Cache invalidation:**

- **Pantry mutations** → invalidate `recipeQueryKeys.available()`
- **Cooking record mutations** → invalidate `recipeQueryKeys.recommendations()` and cooking history queries
- **Recipe mutations** → invalidate `recipeQueryKeys.available()` and `recipeQueryKeys.recipes()`

This approach ensures:

- Category changes only recompute recommendations (cache hit for underlying data)
- Pantry changes trigger availability cache refresh
- Cooking history updates trigger appropriate cache invalidations
- No redundant database fetches when data is already cached

## File Locations

### Recommendation Module

| File                            | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `hooks/recommendation/index.ts` | Main exports (exposes both submodules) |

### Ranking Submodule

| File                                                                | Purpose                               |
| ------------------------------------------------------------------- | ------------------------------------- |
| `hooks/recommendation/ranking/index.ts`                             | Ranking exports and factory functions |
| `hooks/recommendation/ranking/RecipeRankingStrategy.ts`             | Core ranking interface and types      |
| `hooks/recommendation/ranking/CompositeRankingStrategy.ts`          | Composite ranking implementation      |
| `hooks/recommendation/ranking/strategies/DifficultyStrategy.ts`     | Difficulty-based scoring              |
| `hooks/recommendation/ranking/strategies/TimeStrategy.ts`           | Time-based scoring                    |
| `hooks/recommendation/ranking/strategies/DietaryStrategy.ts`        | Dietary preference matching           |
| `hooks/recommendation/ranking/strategies/RandomVarietyStrategy.ts`  | Random variety factor                 |
| `hooks/recommendation/ranking/strategies/FamiliarityStrategy.ts`    | Cook count-based scoring              |
| `hooks/recommendation/ranking/strategies/RecencyPenaltyStrategy.ts` | Recent cook penalty                   |
| `hooks/recommendation/ranking/strategies/UserRatingStrategy.ts`     | User rating-based scoring             |
| `hooks/recommendation/ranking/strategies/ReadinessStrategy.ts`      | Ingredient availability scoring       |
| `hooks/recommendation/ranking/strategies/AlphabeticalStrategy.ts`   | Alphabetical title sorting            |

### Filtering Submodule

| File                                                      | Purpose                           |
| --------------------------------------------------------- | --------------------------------- |
| `hooks/recommendation/filters/index.ts`                   | Filter exports                    |
| `hooks/recommendation/filters/RecipeFilterStrategy.ts`    | Core filter interface and types   |
| `hooks/recommendation/filters/CompositeFilterStrategy.ts` | Composite filter implementation   |
| `hooks/recommendation/filters/AvailabilityFilter.ts`      | Filter by ingredient availability |
| `hooks/recommendation/filters/CategoryFilter.ts`          | Filter by tags/categories         |
| `hooks/recommendation/filters/DietaryFilter.ts`           | Filter by dietary preferences     |

### Integration

| File                                | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `hooks/queries/useRecipeQueries.ts` | `useRecipeRecommendations` and `useRecipeAvailability` hooks   |
| `hooks/queries/recipeQueryKeys.ts`  | Query key definitions for React Query cache management         |
| `data/api/recipeApi.ts`             | `getRecipeRecommendations()` API with pre-fetched data support |
