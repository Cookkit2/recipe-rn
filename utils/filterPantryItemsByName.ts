import type { PantryItem } from "~/types/PantryItem";

/**
 * Client-side pantry name filter for typeahead (expects already-loaded items).
 */
export function filterPantryItemsByName(items: readonly PantryItem[], query: string): PantryItem[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  // ⚡ Bolt Performance Optimization: Replace .filter() with a standard for loop to avoid closure allocation overhead on every keystroke
  const results: PantryItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.name.toLowerCase().includes(q)) {
      results.push(item);
    }
  }
  return results;
}
