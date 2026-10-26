import type { ItemType } from "~/types/PantryItem";

export function mapStorageType(type?: string): Exclude<ItemType, "all"> {
  const value = type?.toLowerCase() ?? "";
  if (value.includes("cabinet") || value.includes("pantry")) return "cabinet";
  if (value.includes("freezer")) return "freezer";
  return "fridge";
}
