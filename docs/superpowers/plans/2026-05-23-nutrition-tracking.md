# Nutrition Information & Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-recipe nutrition macros, automatic allergen detection, daily meal plan nutrition summaries, a weekly chart report, and dietary filtering to Cookkit.

**Architecture:** Inline nutrition fields on the existing Recipe model (WatermelonDB + Supabase). External API called once per recipe to estimate macros, then cached. Allergen detection is a pure local utility. Daily/weekly aggregation computes from meal plan + recipe data with no new tables.

**Tech Stack:** WatermelonDB, Supabase, TanStack Query, react-native-svg (existing chart patterns), Expo Router

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `types/Nutrition.ts` | NutritionSource type, NutritionData interface, NutritionSummary type, DietaryTag type |
| `utils/allergenDetection.ts` | Pure function mapping ingredient names to allergens |
| `utils/__tests__/allergenDetection.test.ts` | Tests for allergen detection |
| `utils/nutritionAggregation.ts` | Aggregate nutrition across recipes for daily/weekly summaries |
| `utils/__tests__/nutritionAggregation.test.ts` | Tests for aggregation |
| `utils/dietaryTagDeriver.ts` | Derive dietary tags from nutrition data + allergens |
| `utils/__tests__/dietaryTagDeriver.test.ts` | Tests for dietary tag derivation |
| `hooks/queries/nutritionQueryKeys.ts` | Query key factory for nutrition queries |
| `hooks/queries/useNutritionQueries.ts` | Hooks: useDayNutrition, useWeeklyNutrition |
| `components/Recipe/Details/RecipeNutrition.tsx` | Replace existing stub with real data display |
| `components/MealPlanCalendar/DailyNutritionBar.tsx` | Compact daily nutrition summary on calendar |
| `components/Nutrition/NutritionChart.tsx` | Weekly bar chart using react-native-svg |
| `app/profile/nutrition-report.tsx` | Weekly nutrition report screen |

### Modified Files

| File | Change |
|------|--------|
| `data/db/schema.ts` | Add protein, carbs, fat, fiber, allergens, nutrition_source columns to recipe table |
| `data/db/migrations.ts` | Add migration toVersion: 5 |
| `data/db/models/Recipe.ts` | Add nutrition fields to RecipeData, updateRecipe, add hasNutrition computed property |
| `lib/supabase/supabase-types.ts` | Add nutrition fields to recipe Row/Insert/Update types |
| `data/supabase-api/RecipeApi.ts` | Add nutrition fields to transformSupabaseRecipe |
| `types/Recipe.ts` | Add nutrition fields to Recipe interface |
| `types/Allergen.ts` | Expand allergen type with new allergens (soy, peanuts, sesame) |
| `hooks/queries/recipeQueryKeys.ts` | Add nutrition query key |
| `components/Preferences/AllergySection.tsx` | Add new allergens (soy, peanuts, sesame) to options |
| `data/db/repositories/RecipeRepository.ts` | Add nutrition-based filtering to searchRecipes |
| `app/meal-plan/index.tsx` | Integrate DailyNutritionBar below day columns |
| `app/profile/index.tsx` | Add link to nutrition report |

---

## Task 1: Types & Schema Foundation

**Files:**
- Modify: `types/Nutrition.ts` (create)
- Modify: `types/Allergen.ts`
- Modify: `data/db/schema.ts`
- Modify: `data/db/migrations.ts`

- [ ] **Step 1: Create Nutrition types**

Create `types/Nutrition.ts`:

```typescript
export type NutritionSource = "estimated" | "manual" | "external_api";

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  allergens?: string[];
  nutritionSource?: NutritionSource;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export type DietaryTag =
  | "keto"
  | "low-carb"
  | "high-protein"
  | "gluten-free"
  | "dairy-free";
```

- [ ] **Step 2: Expand Allergen type**

Update `types/Allergen.ts`:

```typescript
export type Allergen =
  | "milk"
  | "eggs"
  | "nuts"
  | "fish"
  | "shellfish"
  | "wheat"
  | "soy"
  | "peanuts"
  | "sesame";
```

- [ ] **Step 3: Update WatermelonDB schema**

Add columns to the recipe table in `data/db/schema.ts`, after the existing `calories` column:

```typescript
{ name: "protein", type: "number", isOptional: true },
{ name: "carbs", type: "number", isOptional: true },
{ name: "fat", type: "number", isOptional: true },
{ name: "fiber", type: "number", isOptional: true },
{ name: "allergens", type: "string", isOptional: true },
{ name: "nutrition_source", type: "string", isOptional: true },
```

- [ ] **Step 4: Add WatermelonDB migration**

Add to `data/db/migrations.ts` migrations array:

```typescript
{
  toVersion: 5,
  steps: [
    addColumns({
      table: "recipe",
      columns: [
        { name: "protein", type: "number", isOptional: true },
        { name: "carbs", type: "number", isOptional: true },
        { name: "fat", type: "number", isOptional: true },
        { name: "fiber", type: "number", isOptional: true },
        { name: "allergens", type: "string", isOptional: true },
        { name: "nutrition_source", type: "string", isOptional: true },
      ],
    }),
  ],
},
```

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (new columns are optional, existing code unaffected)

- [ ] **Step 6: Commit**

```bash
git add types/Nutrition.ts types/Allergen.ts data/db/schema.ts data/db/migrations.ts
git commit -m "feat: add nutrition fields to schema and types"
```

---

## Task 2: Recipe Model & Data Layer

**Files:**
- Modify: `data/db/models/Recipe.ts`
- Modify: `lib/supabase/supabase-types.ts`
- Modify: `data/supabase-api/RecipeApi.ts`
- Modify: `types/Recipe.ts`

- [ ] **Step 1: Update RecipeData interface**

Add nutrition fields to `RecipeData` in `data/db/models/Recipe.ts`:

```typescript
import type { NutritionSource } from "~/types/Nutrition";

export interface RecipeData {
  title: string;
  description: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  sourceUrl?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  allergens?: string[];
  nutritionSource?: NutritionSource;
  tags?: string[];
  isFavorite?: boolean;
  type?: RecipeType;
}
```

- [ ] **Step 2: Update Recipe model class**

Add field decorators and computed property to the Recipe model class in `data/db/models/Recipe.ts`:

```typescript
@field("protein") protein!: number | undefined;
@field("carbs") carbs!: number | undefined;
@field("fat") fat!: number | undefined;
@field("fiber") fiber!: number | undefined;
@json("allergens", sanitizeJSON) allergens!: string[] | undefined;
@field("nutrition_source") nutritionSource!: NutritionSource | undefined;

get hasNutrition(): boolean {
  return this.calories != null && (this.protein != null || this.carbs != null || this.fat != null);
}
```

- [ ] **Step 3: Update updateRecipe writer**

Add nutrition fields to the `updateRecipe` method in `data/db/models/Recipe.ts`:

```typescript
if (data.protein !== undefined) recipe.protein = data.protein;
if (data.carbs !== undefined) recipe.carbs = data.carbs;
if (data.fat !== undefined) recipe.fat = data.fat;
if (data.fiber !== undefined) recipe.fiber = data.fiber;
if (data.allergens !== undefined) recipe.allergens = data.allergens;
if (data.nutritionSource !== undefined) recipe.nutritionSource = data.nutritionSource;
```

- [ ] **Step 4: Update Supabase types**

Add nutrition fields to the `recipe` table types in `lib/supabase/supabase-types.ts`:

In the `Row` interface:
```typescript
protein: number | null;
carbs: number | null;
fat: number | null;
fiber: number | null;
allergens: string[] | null;
nutrition_source: string | null;
```

In the `Insert` interface:
```typescript
protein?: number | null;
carbs?: number | null;
fat?: number | null;
fiber?: number | null;
allergens?: string[] | null;
nutrition_source?: string | null;
```

In the `Update` interface:
```typescript
protein?: number | null;
carbs?: number | null;
fat?: number | null;
fiber?: number | null;
allergens?: string[] | null;
nutrition_source?: string | null;
```

- [ ] **Step 5: Update RecipeApi transform**

Add nutrition fields to `transformSupabaseRecipe` in `data/supabase-api/RecipeApi.ts`:

```typescript
protein: supabaseRecipe.protein || undefined,
carbs: supabaseRecipe.carbs || undefined,
fat: supabaseRecipe.fat || undefined,
fiber: supabaseRecipe.fiber || undefined,
allergens: supabaseRecipe.allergens || undefined,
nutritionSource: (supabaseRecipe.nutrition_source as NutritionSource) || undefined,
```

- [ ] **Step 6: Update Recipe type**

Add nutrition fields to `types/Recipe.ts`:

```typescript
import type { NutritionSource } from "~/types/Nutrition";

export interface Recipe {
  // ... existing fields ...
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  allergens?: string[];
  nutritionSource?: NutritionSource;
  // ... rest of existing fields ...
}
```

- [ ] **Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add data/db/models/Recipe.ts lib/supabase/supabase-types.ts data/supabase-api/RecipeApi.ts types/Recipe.ts
git commit -m "feat: wire nutrition fields through model, API, and types"
```

---

## Task 3: Allergen Detection Utility (TDD)

**Files:**
- Create: `utils/allergenDetection.ts`
- Create: `utils/__tests__/allergenDetection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `utils/__tests__/allergenDetection.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import { detectAllergens } from "../allergenDetection";

describe("detectAllergens", () => {
  it("detects dairy allergens", () => {
    expect(detectAllergens(["milk", "butter", "garlic"])).toContain("milk");
  });

  it("detects gluten allergens", () => {
    expect(detectAllergens(["wheat flour", "sugar", "eggs"])).toContain("wheat");
  });

  it("detects shellfish allergens", () => {
    expect(detectAllergens(["shrimp", "garlic", "olive oil"])).toContain("shellfish");
  });

  it("detects egg allergens", () => {
    expect(detectAllergens(["eggs", "sugar", "vanilla"])).toContain("eggs");
  });

  it("detects peanut allergens", () => {
    expect(detectAllergens(["peanut butter", "bread"])).toContain("peanuts");
  });

  it("detects nut allergens", () => {
    expect(detectAllergens(["almonds", "honey", "oats"])).toContain("nuts");
  });

  it("detects soy allergens", () => {
    expect(detectAllergens(["soy sauce", "ginger", "garlic"])).toContain("soy");
  });

  it("detects fish allergens", () => {
    expect(detectAllergens(["salmon fillet", "lemon", "dill"])).toContain("fish");
  });

  it("detects sesame allergens", () => {
    expect(detectAllergens(["sesame oil", "soy sauce"])).toContain("sesame");
  });

  it("detects multiple allergens from one ingredient list", () => {
    const result = detectAllergens(["milk", "wheat flour", "eggs", "shrimp"]);
    expect(result).toContain("milk");
    expect(result).toContain("wheat");
    expect(result).toContain("eggs");
    expect(result).toContain("shellfish");
    expect(result).toHaveLength(4);
  });

  it("returns empty array when no allergens detected", () => {
    expect(detectAllergens(["rice", "sugar", "salt", "water"])).toEqual([]);
  });

  it("handles empty ingredient list", () => {
    expect(detectAllergens([])).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(detectAllergens(["MILK", "Butter"])).toContain("milk");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- utils/__tests__/allergenDetection.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `utils/allergenDetection.ts`:

```typescript
import type { Allergen } from "~/types/Allergen";

const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  milk: ["milk", "cheese", "butter", "cream", "yogurt", "whey", "lactose", "dairy"],
  eggs: ["egg", "mayonnaise", "mayo"],
  nuts: ["almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "macadamia"],
  fish: ["salmon", "tuna", "cod", "anchovy", "sardine"],
  shellfish: ["shrimp", "crab", "lobster", "scallop", "prawn", "oyster", "mussel"],
  wheat: ["wheat", "flour", "bread", "pasta", "barley", "rye", "breadcrumbs"],
  soy: ["soy", "tofu", "tempeh"],
  peanuts: ["peanut"],
  sesame: ["sesame", "tahini"],
};

export function detectAllergens(ingredientNames: string[]): Allergen[] {
  const detected = new Set<Allergen>();

  for (const name of ingredientNames) {
    const lower = name.toLowerCase();
    for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        detected.add(allergen as Allergen);
      }
    }
  }

  return Array.from(detected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- utils/__tests__/allergenDetection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add utils/allergenDetection.ts utils/__tests__/allergenDetection.test.ts
git commit -m "feat: add allergen detection utility with tests"
```

---

## Task 4: Nutrition Aggregation Utility (TDD)

**Files:**
- Create: `utils/nutritionAggregation.ts`
- Create: `utils/__tests__/nutritionAggregation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `utils/__tests__/nutritionAggregation.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import { aggregateNutrition, sumNutrition } from "../nutritionAggregation";
import type { NutritionSummary } from "~/types/Nutrition";

describe("aggregateNutrition", () => {
  it("sums nutrition from multiple recipes", () => {
    const recipes = [
      { calories: 400, protein: 20, carbs: 30, fat: 15, fiber: 5 },
      { calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 },
    ];
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 700,
      protein: 30,
      carbs: 70,
      fat: 25,
      fiber: 8,
    });
  });

  it("handles undefined nutrition fields as zero", () => {
    const recipes = [
      { calories: 400, protein: undefined, carbs: 30, fat: undefined, fiber: 5 },
    ];
    const result = aggregateNutrition(recipes);
    expect(result).toEqual({
      calories: 400,
      protein: 0,
      carbs: 30,
      fat: 0,
      fiber: 5,
    });
  });

  it("returns zeros for empty recipe list", () => {
    const result = aggregateNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });

  it("scales by servings multiplier", () => {
    const recipes = [
      { calories: 400, protein: 20, carbs: 30, fat: 15, fiber: 5, servings: 2 },
    ];
    const result = aggregateNutrition(recipes, 2);
    expect(result.calories).toBe(800);
    expect(result.protein).toBe(40);
  });
});

describe("sumNutrition", () => {
  it("sums an array of NutritionSummary objects", () => {
    const summaries: NutritionSummary[] = [
      { calories: 1800, protein: 90, carbs: 200, fat: 60, fiber: 20 },
      { calories: 2000, protein: 100, carbs: 220, fat: 70, fiber: 25 },
    ];
    const result = sumNutrition(summaries);
    expect(result).toEqual({
      calories: 3800,
      protein: 190,
      carbs: 420,
      fat: 130,
      fiber: 45,
    });
  });

  it("returns zeros for empty array", () => {
    const result = sumNutrition([]);
    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- utils/__tests__/nutritionAggregation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `utils/nutritionAggregation.ts`:

```typescript
import type { NutritionSummary } from "~/types/Nutrition";

interface NutritionInput {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  servings?: number;
}

const EMPTY_SUMMARY: NutritionSummary = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

export function aggregateNutrition(
  recipes: NutritionInput[],
  servingsMultiplier: number = 1,
): NutritionSummary {
  if (recipes.length === 0) return { ...EMPTY_SUMMARY };

  return {
    calories: recipes.reduce((sum, r) => sum + (r.calories ?? 0) * servingsMultiplier, 0),
    protein: recipes.reduce((sum, r) => sum + (r.protein ?? 0) * servingsMultiplier, 0),
    carbs: recipes.reduce((sum, r) => sum + (r.carbs ?? 0) * servingsMultiplier, 0),
    fat: recipes.reduce((sum, r) => sum + (r.fat ?? 0) * servingsMultiplier, 0),
    fiber: recipes.reduce((sum, r) => sum + (r.fiber ?? 0) * servingsMultiplier, 0),
  };
}

export function sumNutrition(summaries: NutritionSummary[]): NutritionSummary {
  if (summaries.length === 0) return { ...EMPTY_SUMMARY };

  return {
    calories: summaries.reduce((sum, s) => sum + s.calories, 0),
    protein: summaries.reduce((sum, s) => sum + s.protein, 0),
    carbs: summaries.reduce((sum, s) => sum + s.carbs, 0),
    fat: summaries.reduce((sum, s) => sum + s.fat, 0),
    fiber: summaries.reduce((sum, s) => sum + s.fiber, 0),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- utils/__tests__/nutritionAggregation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add utils/nutritionAggregation.ts utils/__tests__/nutritionAggregation.test.ts
git commit -m "feat: add nutrition aggregation utility with tests"
```

---

## Task 5: Dietary Tag Derivation Utility (TDD)

**Files:**
- Create: `utils/dietaryTagDeriver.ts`
- Create: `utils/__tests__/dietaryTagDeriver.test.ts`

- [ ] **Step 1: Write the failing test**

Create `utils/__tests__/dietaryTagDeriver.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import { deriveDietaryTags } from "../dietaryTagDeriver";

describe("deriveDietaryTags", () => {
  it("derives keto from low carbs and high fat", () => {
    // 10g carbs=40cal, 30g fat=270cal, 20g protein=80cal → fat=69% of total
    const result = deriveDietaryTags({ calories: 390, protein: 20, carbs: 10, fat: 30, fiber: 2 }, []);
    expect(result).toContain("keto");
  });

  it("derives low-carb from carbs under 20g", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 20, carbs: 15, fat: 15, fiber: 5 }, []);
    expect(result).toContain("low-carb");
  });

  it("derives high-protein from protein over 25g", () => {
    const result = deriveDietaryTags({ calories: 400, protein: 30, carbs: 30, fat: 10, fiber: 5 }, []);
    expect(result).toContain("high-protein");
  });

  it("derives gluten-free when gluten not in allergens", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 }, []);
    expect(result).toContain("gluten-free");
  });

  it("does not derive gluten-free when gluten is in allergens", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 }, ["wheat"]);
    expect(result).not.toContain("gluten-free");
  });

  it("derives dairy-free when milk not in allergens", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 }, []);
    expect(result).toContain("dairy-free");
  });

  it("does not derive dairy-free when milk is in allergens", () => {
    const result = deriveDietaryTags({ calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3 }, ["milk"]);
    expect(result).not.toContain("dairy-free");
  });

  it("derives multiple tags at once", () => {
    const result = deriveDietaryTags({ calories: 350, protein: 30, carbs: 5, fat: 20, fiber: 2 }, []);
    expect(result).toContain("keto");
    expect(result).toContain("low-carb");
    expect(result).toContain("high-protein");
    expect(result).toContain("gluten-free");
    expect(result).toContain("dairy-free");
  });

  it("returns empty array for no matching conditions", () => {
    const result = deriveDietaryTags({ calories: 500, protein: 10, carbs: 80, fat: 10, fiber: 3 }, ["wheat", "milk"]);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- utils/__tests__/dietaryTagDeriver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `utils/dietaryTagDeriver.ts`:

```typescript
import type { NutritionSummary, DietaryTag } from "~/types/Nutrition";
import type { Allergen } from "~/types/Allergen";

export function deriveDietaryTags(
  nutrition: NutritionSummary,
  allergens: Allergen[],
): DietaryTag[] {
  const tags: DietaryTag[] = [];

  // Keto: carbs < 10g AND fat > 70% of calories
  const fatCalories = nutrition.fat * 9;
  const totalCalories = nutrition.calories || 1;
  if (nutrition.carbs < 10 && fatCalories / totalCalories > 0.7) {
    tags.push("keto");
  }

  // Low-carb: carbs < 20g per serving
  if (nutrition.carbs < 20) {
    tags.push("low-carb");
  }

  // High-protein: protein > 25g per serving
  if (nutrition.protein > 25) {
    tags.push("high-protein");
  }

  // Gluten-free: no wheat allergen
  if (!allergens.includes("wheat")) {
    tags.push("gluten-free");
  }

  // Dairy-free: no milk allergen
  if (!allergens.includes("milk")) {
    tags.push("dairy-free");
  }

  return tags;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- utils/__tests__/dietaryTagDeriver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add utils/dietaryTagDeriver.ts utils/__tests__/dietaryTagDeriver.test.ts
git commit -m "feat: add dietary tag derivation utility with tests"
```

---

## Task 6: Nutrition Query Keys & Hooks

**Files:**
- Create: `hooks/queries/nutritionQueryKeys.ts`
- Create: `hooks/queries/useNutritionQueries.ts`
- Modify: `hooks/queries/recipeQueryKeys.ts`

- [ ] **Step 1: Create nutrition query keys**

Create `hooks/queries/nutritionQueryKeys.ts`:

```typescript
export const nutritionQueryKeys = {
  all: ["nutrition"] as const,
  day: (date: string) => [...nutritionQueryKeys.all, "day", date] as const,
  week: (weekStart: string) => [...nutritionQueryKeys.all, "week", weekStart] as const,
} as const;
```

- [ ] **Step 2: Add nutrition key to recipe query keys**

Add to `hooks/queries/recipeQueryKeys.ts`:

```typescript
nutrition: (recipeId: string) => [...recipeQueryKeys.all, "nutrition", recipeId] as const,
```

- [ ] **Step 3: Create useDayNutrition hook**

Create `hooks/queries/useNutritionQueries.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { nutritionQueryKeys } from "./nutritionQueryKeys";
import { useCalendarMealPlans } from "./useCalendarMealPlans";
import { aggregateNutrition } from "~/utils/nutritionAggregation";
import type { NutritionSummary } from "~/types/Nutrition";
import type { DayMealPlan } from "~/types/MealPlan";

export function useDayNutrition(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: mealPlans } = useCalendarMealPlans(startOfDay, endOfDay);

  return useQuery({
    queryKey: nutritionQueryKeys.day(startOfDay.toISOString()),
    queryFn: () => {
      if (!mealPlans || mealPlans.length === 0) {
        return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } as NutritionSummary;
      }

      // mealPlans is an array of MealPlanItemWithRecipe — extract recipe nutrition
      const recipes = mealPlans
        .map((mp) => mp.recipe)
        .filter((r): r is NonNullable<typeof r> => r != null);

      return aggregateNutrition(recipes);
    },
    enabled: !!mealPlans,
  });
}

export function useWeeklyNutrition(weekStart: Date) {
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [weekStart.getTime()]);

  const weekEnd = new Date(days[6]!);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: mealPlans } = useCalendarMealPlans(weekStart, weekEnd);

  return useQuery({
    queryKey: nutritionQueryKeys.week(weekStart.toISOString()),
    queryFn: () => {
      if (!mealPlans || mealPlans.length === 0) {
        return [];
      }

      // Group meal plans by day and compute per-day nutrition
      const dayMap = new Map<string, NutritionSummary>();

      for (let i = 0; i < 7; i++) {
        const dateStr = days[i]!.toISOString().split("T")[0]!;
        dayMap.set(dateStr, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      }

      for (const mp of mealPlans) {
        if (!mp.recipe) continue;
        const dateStr = new Date(mp.date).toISOString().split("T")[0]!;
        const existing = dayMap.get(dateStr);
        if (!existing) continue;

        const nutrition = aggregateNutrition([mp.recipe]);
        existing.calories += nutrition.calories;
        existing.protein += nutrition.protein;
        existing.carbs += nutrition.carbs;
        existing.fat += nutrition.fat;
        existing.fiber += nutrition.fiber;
      }

      return Array.from(dayMap.entries()).map(([date, summary]) => ({
        date,
        ...summary,
      }));
    },
    enabled: !!mealPlans,
  });
}
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/queries/nutritionQueryKeys.ts hooks/queries/useNutritionQueries.ts hooks/queries/recipeQueryKeys.ts
git commit -m "feat: add nutrition query keys and hooks for daily/weekly aggregation"
```

---

## Task 7: RecipeNutrition Component (Replace Stub)

**Files:**
- Modify: `components/Recipe/Details/RecipeNutrition.tsx`

- [ ] **Step 1: Replace the RecipeNutrition component**

Replace the contents of `components/Recipe/Details/RecipeNutrition.tsx` with a real data-driven component. The component receives the recipe prop (which now has protein, carbs, fat, fiber, allergens, nutritionSource fields) and renders:

- Per-serving macro values: calories, protein, carbs, fat, fiber in a horizontal row
- Allergen badges below: cross-reference with user's allergen preferences from `PREF_ALLERGENS_KEY` using `useLocalStorageState` — red for user allergens, gray for others
- Empty state: "No nutrition data" message when `hasNutrition` is false
- Uses existing UI primitives: `Card`/`CardContent`, `P`/`H4` typography, `View`

Key implementation details:
- Import `useLocalStorageState` from `~/hooks/useLocalStorageState` with `PREF_ALLERGENS_KEY`
- Import `Allergen` type from `~/types/Allergen`
- Read recipe.allergens (JSON array of Allergen strings), compare against user preferences
- Format macro values with units: `"20g"`, `"400 kcal"`

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Recipe/Details/RecipeNutrition.tsx
git commit -m "feat: replace RecipeNutrition stub with real data display"
```

---

## Task 8: DailyNutritionBar Component

**Files:**
- Create: `components/MealPlanCalendar/DailyNutritionBar.tsx`

- [ ] **Step 1: Create the DailyNutritionBar component**

Create `components/MealPlanCalendar/DailyNutritionBar.tsx`. This is a compact bar shown below each day column in the weekly calendar.

Props: `{ recipes: Recipe[]; calorieTarget?: number }`

Implementation:
- Use `aggregateNutrition` from `~/utils/nutritionAggregation` to compute the summary
- Display format: `"{calories} kcal | P:{protein}g C:{carbs}g F:{fat}g"`
- Progress bar: `Progress` component from `~/components/ui/progress` — width = `calories / calorieTarget * 100`
- Color logic: green (< 80% target), amber (80-100%), red (> 100%)
- Default calorie target: 2000 (configurable via future preference, hardcode for now)
- If no recipes: show nothing (return null)

- [ ] **Step 2: Integrate into meal plan calendar**

Modify `app/meal-plan/index.tsx` to include `DailyNutritionBar` below each day column. Pass the day's planned recipes as the prop.

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/MealPlanCalendar/DailyNutritionBar.tsx app/meal-plan/index.tsx
git commit -m "feat: add daily nutrition summary bar to meal plan calendar"
```

---

## Task 9: NutritionChart Component

**Files:**
- Create: `components/Nutrition/NutritionChart.tsx`

- [ ] **Step 1: Create the NutritionChart component**

Create `components/Nutrition/NutritionChart.tsx` using the existing `react-native-svg` pattern from `components/Analytics/WasteChart.tsx`.

Props: `{ data: Array<{ date: string; calories: number; protein: number; carbs: number; fat: number }>; viewMode: "7day" | "28day" }`

Implementation:
- Bar chart: one bar per day showing total calories (height proportional to max value in dataset)
- Stacked segments within each bar: protein (blue), carbs (amber), fat (red) — using fat/protein/carbs as proportions of total macros
- Weekly average line: dashed horizontal line at average calorie level
- X-axis labels: abbreviated day names
- Follow the same SVG pattern as WasteChart: use `Svg`, `Rect`, `Line`, `Text` from `react-native-svg`
- Wrap in `Card`/`CardContent` from `~/components/ui/card`
- Handle empty data state

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Nutrition/NutritionChart.tsx
git commit -m "feat: add weekly nutrition bar chart component"
```

---

## Task 10: Weekly Nutrition Report Screen

**Files:**
- Create: `app/profile/nutrition-report.tsx`
- Modify: `app/profile/index.tsx`

- [ ] **Step 1: Create the nutrition report screen**

Create `app/profile/nutrition-report.tsx`. Follow the pattern from `app/profile/analytics.tsx`.

Implementation:
- Header with back navigation (use Expo Router `Stack.Screen` options)
- `NutritionChart` component with 7-day / 28-day toggle
- Use `useWeeklyNutrition(new Date())` hook to get data
- Summary stats section below the chart:
  - Weekly averages: `"{avgCalories} kcal avg"`
  - Macro averages: `"P:{avgProtein}g C:{avgCarbs}g F:{avgFat}g avg"`
  - Highest day callout: `"{date}: {calories} kcal"`
  - Lowest day callout: `"{date}: {calories} kcal"`
- Calculate previous week using `new Date(weekStart.getTime() - 7 * 86400000)` and `useWeeklyNutrition` for comparison stats: `"+5% calories, -3% carbs"`
- Wrap in `Animated.ScrollView` with safe area handling (same pattern as other profile screens)

- [ ] **Step 2: Add navigation link to profile screen**

Add a row to `app/profile/index.tsx` that links to the nutrition report. Follow the existing link pattern in that file. Use a nutrition icon from `lucide-uniwind` (e.g., `AppleIcon` or `FlameIcon`).

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/profile/nutrition-report.tsx app/profile/index.tsx
git commit -m "feat: add weekly nutrition report screen with chart"
```

---

## Task 11: Update AllergySection with New Allergens

**Files:**
- Modify: `components/Preferences/AllergySection.tsx`

- [ ] **Step 1: Add new allergen options**

Add three new options to `ALLERGEN_OPTIONS` in `components/Preferences/AllergySection.tsx`:

```typescript
{ label: "Soy", icon: <SoyIcon />, value: "soy" },
{ label: "Peanuts", icon: <PeanutIcon />, value: "peanuts" },
{ label: "Sesame", icon: <SesameIcon />, value: "sesame" },
```

Check `lucide-uniwind` for available icons. If `SoyIcon`, `PeanutIcon`, `SesameIcon` don't exist, use appropriate alternatives or generic icons.

Also update the local `Allergen` type in this file to match the expanded type:

```typescript
export type Allergen = "milk" | "eggs" | "nuts" | "fish" | "shellfish" | "wheat" | "soy" | "peanuts" | "sesame";
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/Preferences/AllergySection.tsx
git commit -m "feat: add soy, peanuts, sesame to allergen preferences"
```

---

## Task 12: Dietary Filtering in Recipe Search

**Files:**
- Modify: `data/db/repositories/RecipeRepository.ts`
- Modify: `hooks/recommendation/filters/DietaryFilter.ts`

- [ ] **Step 1: Add nutrition-based filter options**

Add nutrition filter fields to `RecipeSearchOptions` in `data/db/repositories/RecipeRepository.ts`:

```typescript
export interface RecipeSearchOptions extends SearchOptions {
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  minTotalTime?: number;
  maxTotalTime?: number;
  difficulty?: number;
  minServings?: number;
  maxServings?: number;
  dietaryTags?: DietaryTag[];
}
```

Add filter logic in `searchRecipes` for dietary tags. For each `dietaryTag`:
- `keto`: Filter recipes where `carbs < 10` and `fat * 9 / (calories || 1) > 0.7`
- `low-carb`: Filter where `carbs < 20`
- `high-protein`: Filter where `protein > 25`
- `gluten-free`: Filter where allergens does not contain `"wheat"`
- `dairy-free`: Filter where allergens does not contain `"milk"`

Since WatermelonDB doesn't support computed column filters, apply these as post-query filters on the fetched results.

- [ ] **Step 2: Update DietaryFilter to use recipe allergens**

Modify `hooks/recommendation/filters/DietaryFilter.ts` to also check the `recipe.allergens` field (the new stored allergens from allergen detection), in addition to the existing ingredient-based detection. This provides a fast path — if allergens are already computed on the recipe, use those directly.

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add data/db/repositories/RecipeRepository.ts hooks/recommendation/filters/DietaryFilter.ts
git commit -m "feat: add dietary filtering to recipe search using nutrition data"
```

---

## Task 13: Run Full Test Suite & Final Typecheck

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `bun run test`
Expected: All tests pass

- [ ] **Step 4: Run lint:fix if needed**

Run: `bun run lint:fix`
Then re-run `bun run lint` to verify.
