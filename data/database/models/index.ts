/**
 * Model index file
 * Exports all WatermelonDB models
 */

// For now, just export the table names to fix the immediate import issue
// We'll implement the actual models step by step

// Table names constant
export const TABLE_NAMES = {
  PANTRY_ITEMS: 'pantry_items',
  STEPS_TO_STORE: 'steps_to_store',
  RECIPES: 'recipes',
  RECIPE_INGREDIENTS: 'recipe_ingredients',
  RECIPE_STEPS: 'recipe_steps',
  RECIPE_RACK_ITEMS: 'recipe_rack_items',
  USER_PREFERENCES: 'user_preferences',
  SYNC_METADATA: 'sync_metadata',
} as const;

export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];

// Mock model classes for now
export const modelClasses: any[] = [];

// Mock PantryItem interface for testing
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  category: string;
  type: string;
  image_url: string;
  x: number;
  y: number;
  scale: number;
  created_at: Date;
  updated_at: Date;
}

// Re-export type alias instead of empty interface
export type PantryItemModel = PantryItem;

// Mock default export for compatibility
export default {
  TABLE_NAMES,
  modelClasses,
};
