// ========================
// RECIPE SCALING UTILITIES
// ========================

/**
 * Scales an ingredient quantity based on serving size changes
 * @param quantity - The original ingredient quantity
 * @param originalServings - The original number of servings
 * @param newServings - The new number of servings
 * @returns The scaled quantity with reasonable precision (max 2 decimals)
 */
export const scaleIngredientQuantity = (
  quantity: number,
  originalServings: number,
  newServings: number
): number => {
  // Handle edge cases
  if (quantity === 0) return 0;
  if (originalServings <= 0) return quantity; // Invalid, return original
  if (newServings <= 0) return 0; // Invalid, return 0
  if (originalServings === newServings) return quantity;

  // Calculate scaling factor
  const scaleFactor = newServings / originalServings;
  const scaledQuantity = quantity * scaleFactor;

  // Round to max 2 decimals for reasonable precision
  return Math.round(scaledQuantity * 100) / 100;
};

/**
 * Scales all ingredients in a recipe based on serving size changes
 * @param ingredients - Array of ingredients with quantity property
 * @param originalServings - The original number of servings
 * @param newServings - The new number of servings
 * @returns Array of ingredients with scaled quantities
 */
export const scaleRecipeIngredients = <T extends { quantity: number }>(
  ingredients: T[],
  originalServings: number,
  newServings: number
): T[] => {
  if (!ingredients || ingredients.length === 0) return [];
  if (originalServings <= 0 || newServings <= 0) return ingredients;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: scaleIngredientQuantity(ingredient.quantity, originalServings, newServings),
  }));
};

/**
 * Calculates the scaling factor between two serving sizes
 * @param originalServings - The original number of servings
 * @param newServings - The new number of servings
 * @returns The scaling factor (e.g., 2 means double, 0.5 means half)
 */
export const calculateScalingFactor = (originalServings: number, newServings: number): number => {
  if (originalServings <= 0) return 1;
  if (newServings <= 0) return 0;
  if (originalServings === newServings) return 1;

  return newServings / originalServings;
};

/**
 * Checks if a recipe is being scaled up or down
 * @param originalServings - The original number of servings
 * @param newServings - The new number of servings
 * @returns "up" if scaling up, "down" if scaling down, "none" if no change
 */
export const getScalingDirection = (
  originalServings: number,
  newServings: number
): "up" | "down" | "none" => {
  if (originalServings === newServings) return "none";
  if (newServings > originalServings) return "up";
  return "down";
};

// Performance Optimization: Extract static array to avoid recreation on every call
const COMMON_FACTORS = [
  { value: 2, label: "Double (2x)" },
  { value: 3, label: "Triple (3x)" },
  { value: 4, label: "Quadruple (4x)" },
  { value: 0.5, label: "Half (0.5x)" },
  { value: 0.33, label: "Third (0.33x)" },
  { value: 0.25, label: "Quarter (0.25x)" },
];

/**
 * Formats the scaling change as a readable string
 * @param originalServings - The original number of servings
 * @param newServings - The new number of servings
 * @returns A string like "Double (2x)", "Half (0.5x)", or "No change"
 */
export const formatScalingChange = (originalServings: number, newServings: number): string => {
  if (originalServings === newServings) return "No change";

  const factor = calculateScalingFactor(originalServings, newServings);

  // Performance Optimization: Use a regular for loop over pre-allocated array instead of Object.entries
  for (let i = 0; i < COMMON_FACTORS.length; i++) {
    const commonFactor = COMMON_FACTORS[i];
    if (commonFactor && Math.abs(factor - commonFactor.value) < 0.01) {
      return commonFactor.label;
    }
  }

  // Default to displaying the factor
  return `${factor >= 1 ? "Scale up" : "Scale down"} (${factor.toFixed(2)}x)`;
};

/**
 * Validates if a serving size is valid for scaling
 * @param servings - The serving size to validate
 * @returns true if valid, false otherwise
 */
export const isValidServingSize = (servings: number): boolean => {
  return typeof servings === "number" && !isNaN(servings) && isFinite(servings) && servings > 0;
};

// Performance Optimization: Extract static array to avoid recreation on every call
const COMMON_FRACTIONS = [
  { decimal: 0.0625, value: 1 / 16 }, // 1/16
  { decimal: 0.125, value: 1 / 8 }, // 1/8
  { decimal: 0.1875, value: 3 / 16 }, // 3/16
  { decimal: 0.25, value: 1 / 4 }, // 1/4
  { decimal: 0.333, value: 1 / 3 }, // 1/3
  { decimal: 0.375, value: 3 / 8 }, // 3/8
  { decimal: 0.5, value: 1 / 2 }, // 1/2
  { decimal: 0.625, value: 5 / 8 }, // 5/8
  { decimal: 0.667, value: 2 / 3 }, // 2/3
  { decimal: 0.75, value: 3 / 4 }, // 3/4
  { decimal: 0.875, value: 7 / 8 }, // 7/8
];

/**
 * Adjusts a quantity to a reasonable fraction if it's close to common cooking fractions
 * @param quantity - The quantity to adjust
 * @returns The quantity as a decimal, or adjusted to nearest common fraction if very close
 */
export const adjustToCommonFraction = (quantity: number): number => {
  if (quantity % 1 === 0) return quantity;

  const whole = Math.floor(quantity);
  const fractional = quantity - whole;

  // Check if fractional part is close to a common fraction (within 0.02)
  for (let i = 0; i < COMMON_FRACTIONS.length; i++) {
    const commonFraction = COMMON_FRACTIONS[i];
    if (commonFraction && Math.abs(fractional - commonFraction.decimal) < 0.02) {
      return whole + commonFraction.value;
    }
  }

  return quantity;
};
