/**
 * Image Constants
 *
 * Default images and placeholders used throughout the app
 */

export const DEFAULT_IMAGES = {
  // Generic food placeholder
  GENERIC_FOOD: require("~/assets/images/placeholder.png"),

  // Category-specific defaults
  CABINET: require("~/assets/images/cabinet.png"),
  FRIDGE: require("~/assets/images/fridge.png"),

  // Specific ingredients
  TOMATO: require("~/assets/images/tomato.png"),
  ONION: require("~/assets/images/onion.png"),
  GARLIC: require("~/assets/images/garlic.png"),
  POTATO: require("~/assets/images/potato.png"),
  PASTA: require("~/assets/images/pasta.png"),
  MILK: require("~/assets/images/milk.png"),
  CHICKEN: require("~/assets/images/chicken-breast.png"),
} as const;

/**
 * Get appropriate placeholder image based on ingredient name or category
 */
export function getPlaceholderImage(
  ingredientName?: string,
  type?: string
) {
  if (!ingredientName && !type) {
    return DEFAULT_IMAGES.GENERIC_FOOD;
  }

  const name = ingredientName?.toLowerCase() || "";
  const cat = type?.toLowerCase() || "";

  // Match by ingredient name first
  if (name.includes("tomato")) return DEFAULT_IMAGES.TOMATO;
  if (name.includes("onion")) return DEFAULT_IMAGES.ONION;
  if (name.includes("garlic")) return DEFAULT_IMAGES.GARLIC;
  if (name.includes("potato")) return DEFAULT_IMAGES.POTATO;
  if (name.includes("pasta")) return DEFAULT_IMAGES.PASTA;
  if (name.includes("milk")) return DEFAULT_IMAGES.MILK;
  if (name.includes("chicken")) return DEFAULT_IMAGES.CHICKEN;

  // Match by category
  if (cat.includes("cabinet") || cat.includes("pantry"))
    return DEFAULT_IMAGES.CABINET;
  if (cat.includes("fridge") || cat.includes("refrigerator"))
    return DEFAULT_IMAGES.FRIDGE;

  // Default fallback
  return "";
}
