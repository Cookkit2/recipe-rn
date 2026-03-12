/**
 * Query key factory for meal plan template related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const mealPlanTemplateQueryKeys = {
  // Base key for all meal plan template queries
  all: ["mealPlanTemplates"] as const,

  // All meal plan templates
  templates: () => [...mealPlanTemplateQueryKeys.all, "templates"] as const,

  // Single template by ID
  byId: (templateId: string) =>
    [...mealPlanTemplateQueryKeys.all, "template", templateId] as const,

  // Search templates
  search: (searchTerm: string) =>
    [...mealPlanTemplateQueryKeys.all, "search", searchTerm] as const,

  // Template application status
  application: (templateId: string, startDate: string) =>
    [...mealPlanTemplateQueryKeys.all, "application", templateId, startDate] as const,
} as const;
