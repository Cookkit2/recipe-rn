/**
 * Query key factory for meal plan related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const mealPlanQueryKeys = {
  // Base key for all meal plan queries
  all: ["mealPlan"] as const,

  // All meal plan items
  items: () => [...mealPlanQueryKeys.all, "items"] as const,

  // Single meal plan item by recipe ID
  byRecipeId: (recipeId: string) => [...mealPlanQueryKeys.items(), "recipe", recipeId] as const,

  // Check if recipe is in plan
  isInPlan: (recipeId: string) => [...mealPlanQueryKeys.all, "isInPlan", recipeId] as const,

  // Planned recipe count
  count: () => [...mealPlanQueryKeys.all, "count"] as const,

  // Grocery list (computed from meal plan)
  groceryList: () => [...mealPlanQueryKeys.all, "groceryList"] as const,

  // Grocery item check states
  groceryChecks: () => [...mealPlanQueryKeys.all, "groceryChecks"] as const,

  // Calendar meal plans by date range
  dateRange: (startDate: string, endDate: string) =>
    [...mealPlanQueryKeys.all, "dateRange", startDate, endDate] as const,

  // All meal plan templates
  templates: () => [...mealPlanQueryKeys.all, "templates"] as const,

  // Single template by ID
  templateById: (templateId: string) => [...mealPlanQueryKeys.all, "template", templateId] as const,
} as const;
