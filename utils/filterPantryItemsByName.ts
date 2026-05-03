import type { PantryItem } from "~/types/PantryItem";

/**
 * Client-side pantry name filter for typeahead (expects already-loaded items).
 */
export function filterPantryItemsByName(items: readonly PantryItem[], query: string): PantryItem[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  return items.filter((item) => item.name.toLowerCase().includes(q));
}
