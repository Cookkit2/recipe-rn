# Nutrition Information & Tracking — Design Spec

**Date:** 2026-05-23
**Status:** Approved
**Architecture:** Inline fields on Recipe model

## Overview

Add basic nutritional analysis to Cookkit recipes: per-serving macros, automatic allergen detection, daily nutrition summaries on the meal plan calendar, a weekly chart report, and dietary filtering. External API called once per recipe to populate data, then cached in Supabase.

## Section 1: Data Model & Schema

### WatermelonDB Schema Changes

Add optional columns to the existing `Recipe` table in `data/db/schema.ts`:

| Field | Type | Description |
|-------|------|-------------|
| `calories` | number, optional | kcal per serving (already exists) |
| `protein` | number, optional | grams per serving |
| `carbs` | number, optional | grams per serving |
| `fat` | number, optional | grams per serving |
| `fiber` | number, optional | grams per serving |
| `allergens` | string, optional | JSON array of allergen tags |
| `nutrition_source` | string, optional | `"estimated"` \| `"manual"` \| `"external_api"` |

### Supabase Schema

Mirror the same new fields on the `recipe` table in Supabase. Update `supabase-types.ts` accordingly.

### Allergen Enum

Defined in `types/Allergen.ts`:

```typescript
export type Allergen =
  | "gluten"
  | "dairy"
  | "nuts"
  | "peanuts"
  | "shellfish"
  | "eggs"
  | "soy"
  | "fish"
  | "sesame";
```

### Allergen Detection

Pure utility function in `utils/allergenDetection.ts`. Maps ingredient name keywords to allergens:

- milk, cheese, butter, cream, yogurt, whey → `dairy`
- wheat, flour, bread, pasta, barley, rye, breadcrumbs → `gluten`
- shrimp, crab, lobster, scallops → `shellfish`
- egg, eggs, mayonnaise → `eggs`
- peanut, peanuts → `peanuts`
- almond, walnut, cashew, pecan, hazelnut, pistachio → `nuts`
- soy, soy sauce, tofu, tempeh → `soy`
- salmon, tuna, cod, anchovy → `fish`
- sesame, tahini → `sesame`

Runs automatically whenever recipe ingredients are saved. No API call required.

### Migration

WatermelonDB migration adds the new optional columns. Existing recipes keep `null` nutrition until populated by backfill or user action.

### Recipe Model Update

Update `data/db/models/Recipe.ts` `RecipeData` interface to include the new fields. Add computed property `hasNutrition` that returns true when calories and at least one macro exist.

## Section 2: Nutrition Estimation Flow

### External API Lookup

- API choice: Edamam, USDA FoodData Central, or Nutritionix (decide at implementation time)
- Called once per recipe to analyze ingredients
- Input: recipe title + ingredients (name, quantity, unit) + servings
- Output: calories, protein, carbs, fat, fiber per serving
- Results stored directly on the recipe record in Supabase and synced to WatermelonDB

### When Estimation Triggers

1. New recipe created or imported with no nutrition data
2. User explicitly requests re-estimation (e.g., after editing ingredients)
3. Batch backfill for existing recipes missing nutrition data

### User Overrides

- Users can manually edit any nutrition field (calories, protein, carbs, fat, fiber)
- `nutrition_source` field tracks provenance: `"estimated"`, `"manual"`, or `"external_api"`
- Manual edits are preserved — not overwritten by future re-estimations
- Only recipes with `nutrition_source !== "manual"` are eligible for automatic re-estimation

### Allergen Detection

Runs automatically on ingredient save. Pure local logic, no network required. Results stored in the `allergens` JSON field.

## Section 3: Per-Recipe Nutrition Display

### RecipeNutrition Component

Replace the existing stub in `components/Recipe/Details/RecipeNutrition.tsx`:

- Per-serving breakdown: calories, protein, carbs, fat, fiber
- Compact card layout with macro values
- Allergen badges: colored chips below macros
  - Red: allergens matching user's preferences (from `PREF_ALLERGENS_KEY`)
  - Gray: other detected allergens
- "Edit nutrition" action for inline editing or re-estimation trigger
- Loading state: shimmer while estimation is in progress
- Empty state: "Estimate nutrition" button when no data exists

### Recipe List Cards

Surface calorie count badge on recipe cards. Already have `calories` field — just display it.

### Auto-Derived Dietary Tags

Nutrition-based classification for tag suggestions:

| Tag | Condition |
|-----|-----------|
| `keto` | carbs < 10g AND fat > 70% of calories |
| `low-carb` | carbs < 20g per serving |
| `high-protein` | protein > 25g per serving |
| `gluten-free` | `gluten` not in allergens |
| `dairy-free` | `dairy` not in allergens |

`vegetarian` and `vegan` cannot be auto-derived from macros alone — remain as manual tags.

## Section 4: Daily Nutrition Summary on Meal Plan

### Integration Point

Existing meal plan weekly calendar at `app/meal-plan/`.

### Daily Summary Bar

Below each day in the calendar:
- Total calories + macro breakdown for all planned meals that day
- Format: `1,420 kcal | P:85g C:120g F:55g`
- Progress bar against daily calorie target (default 2,000 kcal, configurable in preferences)
- Color-coded: green (under target), amber (near), red (over)

### Day Detail View

Tapping a day shows expanded nutrition:
- Per-meal breakdown (breakfast, lunch, dinner, snack)
- Running total vs daily target
- Macro visualization (pie chart or stacked bar)

### Data Flow

- Sum nutrition fields from all recipes planned for that day
- No new table — aggregate from existing meal plan + recipe data
- TanStack Query hook: `useDayNutrition(date)` computes from meal plan recipe references

## Section 5: Weekly Nutrition Report

### New Screen

`app/profile/nutrition-report.tsx`, accessible from profile tab.

### Chart Summary

- Bar chart: one bar per day showing total calories
- Macro breakdown: stacked or grouped bars for protein/carbs/fat
- Weekly average line overlay
- 7-day and 28-day view toggle

### Summary Stats

Below the chart:
- Weekly averages: `Avg: 1,850 kcal | P:90g C:150g F:60g`
- Highest/lowest day callout
- Comparison to previous week: `+5% calories, -3% carbs`

### Data Flow

- `useWeeklyNutrition(weekStart)` hook — aggregates daily meal plan nutrition for 7 days
- Reuses same aggregation logic as daily summary
- Chart library: `react-native-svg` charts or existing project charting dependency

## Section 6: Dietary Filtering

### Integration Point

Existing recipe search in `RecipeRepository.searchRecipes()` and search hooks.

### Filter Chips

Dietary filter chips in recipe search/browse UI:
- vegetarian, vegan, keto, low-carb, gluten-free, dairy-free, high-protein
- Tags match against existing `tags` field and auto-derived nutrition tags

### User Allergen Filtering

- User allergen preferences (already stored via `PREF_ALLERGENS_KEY`) cross-referenced with recipe allergens
- Recipes containing user's allergens: flagged with warning badge or hidden (configurable)
- Visual: warning badge on recipe cards

### Filter Flow

1. User selects dietary filter chip(s)
2. Query maps to tag values and/or nutrition thresholds
3. `searchRecipes()` filters by tags and/or macro conditions
4. Allergen warnings applied client-side based on user preferences
