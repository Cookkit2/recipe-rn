import type { ItemType } from "~/types/PantryItem";

/**
 * Query key factory for pantry-related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const pantryQueryKeys = {
  // Base key for all pantry queries
  all: ["pantry"] as const,

  // All pantry items
  items: () => [...pantryQueryKeys.all, "items"] as const,

  // Pantry items filtered by type
  itemsByType: (type: Exclude<ItemType, "all">) =>
    [...pantryQueryKeys.items(), "type", type] as const,

  // Single pantry item
  item: (id: string) => [...pantryQueryKeys.items(), id] as const,

  // Search results
  search: (query: string) => [...pantryQueryKeys.items(), "search", query] as const,

  // Expiring items
  expiring: (days: number = 3) => [...pantryQueryKeys.items(), "expiring", days] as const,
} as const;
