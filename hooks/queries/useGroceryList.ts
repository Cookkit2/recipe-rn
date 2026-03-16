import { useMemo } from "react";
import { useMealPlanItems, useGroceryItemAttributes, useCalendarMealPlans } from "./useMealPlanQueries";
import { usePantryItems } from "./usePantryQueries";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import {
  convertToBaseUnit,
  areDimensionsCompatible,
  getUnitDimension,
  roundToReasonablePrecision,
} from "~/utils/unit-converter";
import { aggregateQuantities, compareQuantities } from "~/utils/quantity-comparison";

/**
 * Grocery category for organizing items
 */
export type GroceryCategory =
  | "produce"
  | "dairy"
  | "meat"
  | "pantry"
  | "other"
  | "purchased";

/**
 * A grocery item with calculated quantities and metadata
 */
export interface GroceryItem {
  /** Display name of the ingredient */
  name: string;
  /** Normalized name for comparison (lowercase, trimmed) */
  normalizedName: string;
  /** Total quantity needed across all planned recipes */
  totalQuantity: number;
  /** Unit of measurement (e.g., "cup", "oz", "piece") */
  unit: string;
  /** Quantity needed to purchase (total minus pantry stock) */
  neededQuantity: number;
  /** Quantity already available in pantry */
  pantryQuantity: number;
  /** Recipe titles that require this ingredient */
  fromRecipes: string[];
  /** Category for organizing the grocery list */
  category: GroceryCategory;
  /** Whether the item is checked off in the list */
  isChecked: boolean;
  /** Whether the needed quantity is fully covered by pantry stock */
  isCovered: boolean;
}

/**
 * A section of the grocery list grouped by category
 */
export interface GroceryListSection {
  /** Category identifier */
  category: GroceryCategory;
  /** Display title for the category */
  title: string;
  /** Emoji icon for the category */
  emoji: string;
  /** Items in this category, sorted by covered status then name */
  items: GroceryItem[];
}

// Category configuration
const CATEGORY_CONFIG: Record<GroceryCategory, { title: string; emoji: string }> = {
  produce: { title: "Produce", emoji: "🥬" },
  dairy: { title: "Dairy", emoji: "🥛" },
  meat: { title: "Meat & Seafood", emoji: "🥩" },
  pantry: { title: "Pantry", emoji: "🥫" },
  other: { title: "Other", emoji: "📦" },
  purchased: { title: "Purchased", emoji: "✅" },
};

// Keywords to categorize ingredients
const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  produce: [
    "lettuce",
    "tomato",
    "onion",
    "garlic",
    "pepper",
    "carrot",
    "celery",
    "cucumber",
    "spinach",
    "kale",
    "broccoli",
    "cauliflower",
    "potato",
    "mushroom",
    "zucchini",
    "squash",
    "corn",
    "bean",
    "pea",
    "asparagus",
    "cabbage",
    "eggplant",
    "avocado",
    "lemon",
    "lime",
    "orange",
    "apple",
    "banana",
    "berry",
    "grape",
    "melon",
    "mango",
    "pineapple",
    "ginger",
    "herb",
    "basil",
    "cilantro",
    "parsley",
    "mint",
    "thyme",
    "rosemary",
    "scallion",
    "leek",
    "shallot",
    "chili",
    "jalapeño",
    "fruit",
    "vegetable",
  ],
  dairy: [
    "milk",
    "cream",
    "cheese",
    "butter",
    "yogurt",
    "sour cream",
    "egg",
    "parmesan",
    "mozzarella",
    "cheddar",
    "feta",
    "ricotta",
    "cottage",
    "half and half",
    "whipping cream",
    "buttermilk",
    "ghee",
  ],
  meat: [
    "chicken",
    "beef",
    "pork",
    "lamb",
    "turkey",
    "duck",
    "bacon",
    "ham",
    "sausage",
    "ground",
    "steak",
    "breast",
    "thigh",
    "wing",
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "scallop",
    "clam",
    "mussel",
    "oyster",
    "anchovy",
    "cod",
    "tilapia",
    "halibut",
    "meat",
    "seafood",
    "poultry",
  ],
  pantry: [
    "flour",
    "sugar",
    "salt",
    "pepper",
    "oil",
    "vinegar",
    "soy sauce",
    "rice",
    "pasta",
    "noodle",
    "bread",
    "crumb",
    "stock",
    "broth",
    "sauce",
    "ketchup",
    "mustard",
    "mayo",
    "honey",
    "maple",
    "spice",
    "cumin",
    "paprika",
    "oregano",
    "cinnamon",
    "vanilla",
    "baking",
    "powder",
    "soda",
    "yeast",
    "can",
    "canned",
    "dried",
    "nut",
    "almond",
    "walnut",
    "peanut",
    "sesame",
    "coconut",
    "olive",
    "vegetable oil",
    "wine",
    "mirin",
    "sake",
    "worcestershire",
  ],
  other: [],
  purchased: [], // Checked items go here - no keywords needed
};

/**
 * Categorizes an ingredient based on its name
 *
 * @param name - The ingredient name to categorize
 * @returns The grocery category for this ingredient
 *
 * @remarks
 * Uses keyword matching to determine category.
 * Returns "other" if no matching keywords are found.
 */
function categorizeIngredient(name: string): GroceryCategory {
  const lowerName = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Skip 'other' and 'purchased' - 'other' is the fallback, 'purchased' is for checked items
    if (category === "other" || category === "purchased") continue;

    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category as GroceryCategory;
      }
    }
  }

  return "other";
}

/**
 * Normalizes an ingredient name for comparison
 *
 * @param name - The ingredient name to normalize
 * @returns Lowercase, trimmed version of the name
 */
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

interface CombinedQuantityResult {
  quantity: number;
  unit: string;
  canCombine: boolean;
}

/**
 * Combine two ingredient quantities with unit conversion.
 * Converts both quantities to base units, sums them, and converts back
 * to a human-readable unit. Handles incompatible dimensions by keeping separate.
 *
 * @param qty1 - First quantity
 * @param unit1 - First unit (e.g., "g", "oz", "cup")
 * @param qty2 - Second quantity
 * @param unit2 - Second unit
 * @returns Object with combined quantity, unit, and whether combination was possible
 */
function combineIngredientWithConversion(
  qty1: number,
  unit1: string,
  qty2: number,
  unit2: string
): CombinedQuantityResult {
  // Handle edge cases: treat only null/undefined/NaN as invalid quantities
  if (qty1 == null || isNaN(qty1)) {
    return { quantity: qty2, unit: unit2, canCombine: true };
  }
  if (qty2 == null || isNaN(qty2)) {
    return { quantity: qty1, unit: unit1, canCombine: true };
  }

  // Check if units are compatible (same dimension)
  if (!areDimensionsCompatible(unit1, unit2)) {
    // Incompatible dimensions (e.g., weight vs volume)
    // Return the first quantity as-is and indicate they cannot be combined
    return { quantity: qty1, unit: unit1, canCombine: false };
  }

  // Same unit - simple addition
  if (unit1.toLowerCase() === unit2.toLowerCase()) {
    return {
      quantity: roundToReasonablePrecision(qty1 + qty2),
      unit: unit1,
      canCombine: true,
    };
  }

  // Convert both quantities to base units for accurate comparison
  const baseQty1 = convertToBaseUnit(qty1, unit1);
  const baseQty2 = convertToBaseUnit(qty2, unit2);

  // If conversion failed for either, keep the first unit and simple sum
  if (baseQty1 == null || baseQty2 == null) {
    return {
      quantity: roundToReasonablePrecision(qty1 + qty2),
      unit: unit1,
      canCombine: true,
    };
  }

  // Sum in base units
  const totalBaseQty = baseQty1 + baseQty2;

  // Convert back to first unit for consistent display
  // Get how many base units are in 1 of the target unit
  const baseUnitsPerTargetUnit = convertToBaseUnit(1, unit1);
  let convertedQty: number;
  // Guard against invalid, zero, or near-zero conversion factors to avoid division by zero
  if (baseUnitsPerTargetUnit == null || Math.abs(baseUnitsPerTargetUnit) < Number.EPSILON) {
    convertedQty = totalBaseQty;
  } else {
    convertedQty = totalBaseQty / baseUnitsPerTargetUnit;
  }

  return {
    quantity: roundToReasonablePrecision(convertedQty),
    unit: unit1,
    canCombine: true,
  };
}

/**
 * Smart hook that computes the grocery list from the meal plan
 *
 * @returns Object containing grocery list data, sections, stats, and loading state
 *
 * @remarks
 * This hook performs the following operations:
 * 1. Aggregates ingredients from all planned recipes
 * 2. Combines duplicate ingredients across recipes
 * 3. Subtracts available pantry stock
 * 4. Groups items by category (produce, dairy, meat, pantry, other)
 * 5. Respects user-checked and deleted states for items
 *
 * The returned object includes:
 * - `groceryList`: Array of all grocery items
 * - `sections`: Array of categorized sections for display
 * - `stats`: Statistics about the list (total, needed, checked, covered items)
 * - `isLoading`: Whether the data is being loaded
 * - `error`: Any error that occurred
 * - `isEmpty`: Whether the grocery list is empty
 * - `hasNeededItems`: Whether there are items that need to be purchased
 */
export function useGroceryList(startDate?: Date, endDate?: Date) {
  // Use date-filtered query if dates provided, otherwise get all items
  const useDateFiltered = !!startDate && !!endDate;

  const calendarQuery = useCalendarMealPlans(
    startDate || new Date(),
    endDate || new Date(),
    useDateFiltered
  );
  const allItemsQuery = useMealPlanItems();

  const {
    data: mealPlanItems,
    isLoading: isMealPlanLoading,
    error: mealPlanError,
  } = useDateFiltered ? calendarQuery : allItemsQuery;

  const { data: pantryItems, isLoading: isPantryLoading } = usePantryItems();
  const { data: attributesMap, isLoading: isAttributesLoading } = useGroceryItemAttributes();

  const isLoading = isMealPlanLoading || isPantryLoading || isAttributesLoading;

  const groceryList = useMemo(() => {
    if (!mealPlanItems || mealPlanItems.length === 0) {
      return [];
    }

    // Step 1: Aggregate all ingredients from planned recipes
    const ingredientMap = new Map<
      string,
      {
        name: string;
        totalQuantity: number;
        unit: string;
        fromRecipes: string[];
      }
    >();

    for (const mealPlanItem of mealPlanItems) {
      if (!mealPlanItem.recipe) continue;

      const recipe = mealPlanItem.recipe;
      const servingsMultiplier = mealPlanItem.servings / (recipe.servings || 1);

      for (const ingredient of recipe.ingredients) {
        const normalizedName = normalizeIngredientName(ingredient.name);
        const scaledQuantity = ingredient.quantity * servingsMultiplier;

        const existing = ingredientMap.get(normalizedName);
        if (existing) {
          // Combine quantities with unit conversion
          const combined = combineIngredientWithConversion(
            existing.totalQuantity,
            existing.unit,
            scaledQuantity,
            ingredient.unit
          );

          if (combined.canCombine) {
            existing.totalQuantity = combined.quantity;
            existing.unit = combined.unit;
          } else {
            // Units are incompatible; keep existing quantity and unit but log a warning.
            console.warn("Incompatible units when combining ingredient in grocery list:", {
              ingredientName: ingredient.name,
              existingQuantity: existing.totalQuantity,
              existingUnit: existing.unit,
              additionalQuantity: scaledQuantity,
              additionalUnit: ingredient.unit,
            });
          }
          if (!existing.fromRecipes.includes(recipe.title)) {
            existing.fromRecipes.push(recipe.title);
          }
        } else {
          ingredientMap.set(normalizedName, {
            name: ingredient.name,
            totalQuantity: scaledQuantity,
            unit: ingredient.unit,
            fromRecipes: [recipe.title],
          });
        }
      }
    }

    // Step 2: Calculate needed quantities (subtract pantry stock with unit conversion)
    const groceryItems: GroceryItem[] = [];

    for (const [normalizedName, ingredient] of ingredientMap) {
      // Collect ALL matching pantry items (not just the first one)
      const matchingPantryItems: Array<{ quantity: number; unit: string }> = [];

      if (pantryItems) {
        for (const pantryItem of pantryItems) {
          const isMatch = isIngredientMatch(
            pantryItem.name,
            ingredient.name,
            pantryItem.synonyms?.map((s) => s.synonym)
          );

          if (isMatch) {
            matchingPantryItems.push({
              quantity: pantryItem.quantity,
              unit: pantryItem.unit,
            });
            // Don't break - aggregate all matching items
          }
        }
      }

      // Calculate pantry quantity with unit conversion
      let pantryQuantityInRecipeUnit = 0;
      let totalPantryQuantity = 0; // Raw quantity for display

      if (matchingPantryItems.length > 0) {
        // Try to aggregate quantities using base unit conversion
        const aggregatedQuantity = aggregateQuantities(matchingPantryItems);

        if (aggregatedQuantity !== null) {
          // Units are compatible - convert aggregated base unit to recipe unit
          const recipeBaseUnit = getUnitDimension(ingredient.unit);
          if (recipeBaseUnit) {
            // For weight (g base) and volume (ml base), convert from base to recipe unit
            const recipeInBase = convertToBaseUnit(ingredient.totalQuantity, ingredient.unit);
            if (recipeInBase !== null && recipeInBase > 0) {
              // Calculate how much of the recipe requirement is covered
              const coverageRatio = Math.min(1, aggregatedQuantity / recipeInBase);
              pantryQuantityInRecipeUnit = ingredient.totalQuantity * coverageRatio;
              totalPantryQuantity = pantryQuantityInRecipeUnit;
            } else {
              // Unknown units, fall back to simple sum
              totalPantryQuantity = matchingPantryItems.reduce((sum, item) => sum + item.quantity, 0);
              pantryQuantityInRecipeUnit = totalPantryQuantity;
            }
          } else {
            // Unknown recipe dimension, fall back to simple sum
            totalPantryQuantity = matchingPantryItems.reduce((sum, item) => sum + item.quantity, 0);
            pantryQuantityInRecipeUnit = totalPantryQuantity;
          }
        } else {
          // Units are incompatible - use simple sum of first match as fallback
          const firstMatch = matchingPantryItems[0];
          if (firstMatch) {
            totalPantryQuantity = firstMatch.quantity;
            pantryQuantityInRecipeUnit = totalPantryQuantity;
          }
        }
      }

      const neededQuantity = Math.max(0, ingredient.totalQuantity - pantryQuantityInRecipeUnit);
      const isCovered = neededQuantity <= 0;

      const attributes = attributesMap?.[normalizedName] || { isChecked: false, isDeleted: false };

      if (attributes.isDeleted) {
        continue;
      }

      groceryItems.push({
        name: ingredient.name,
        normalizedName,
        totalQuantity: ingredient.totalQuantity,
        unit: ingredient.unit,
        neededQuantity,
        pantryQuantity: totalPantryQuantity,
        fromRecipes: ingredient.fromRecipes,
        category: categorizeIngredient(ingredient.name),
        isChecked: attributes.isChecked,
        isCovered,
      });
    }

    return groceryItems;
  }, [mealPlanItems, pantryItems, attributesMap]);

  // Group items by category, with checked items in a trailing Purchased section
  const sections = useMemo((): GroceryListSection[] => {
    const categoryMap = new Map<GroceryCategory, GroceryItem[]>();
    const purchasedItems: GroceryItem[] = [];

    // Initialize all categories except 'purchased'
    for (const category of Object.keys(CATEGORY_CONFIG) as GroceryCategory[]) {
      if (category !== "purchased") {
        categoryMap.set(category, []);
      }
    }

    // Group items - separate checked items into purchased section
    for (const item of groceryList) {
      if (item.isChecked) {
        purchasedItems.push(item);
      } else {
        const items = categoryMap.get(item.category) || [];
        items.push(item);
        categoryMap.set(item.category, items);
      }
    }

    // Convert to sections array
    const sections: GroceryListSection[] = [];

    for (const [category, items] of categoryMap) {
      if (items.length > 0) {
        const config = CATEGORY_CONFIG[category];
        sections.push({
          category,
          title: config.title,
          emoji: config.emoji,
          items: items.sort((a, b) => {
            // Covered items at bottom, then alphabetical
            if (a.isCovered !== b.isCovered) {
              return a.isCovered ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
          }),
        });
      }
    }

    // Add purchased section at the end if there are checked items
    if (purchasedItems.length > 0) {
      const config = CATEGORY_CONFIG.purchased;
      sections.push({
        category: "purchased",
        title: config.title,
        emoji: config.emoji,
        items: purchasedItems.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // Sort sections by predefined order (purchased will always be last due to when it's added)
    const categoryOrder: GroceryCategory[] = ["produce", "dairy", "meat", "pantry", "other", "purchased"];
    return sections.sort(
      (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    );
  }, [groceryList]);

  // Compute statistics
  const stats = useMemo(() => {
    const totalItems = groceryList.length;
    const neededItems = groceryList.filter((item) => !item.isCovered).length;
    const checkedItems = groceryList.filter((item) => item.isChecked).length;
    const coveredItems = groceryList.filter((item) => item.isCovered).length;

    return {
      totalItems,
      neededItems,
      checkedItems,
      coveredItems,
      allCheckedOrCovered: neededItems > 0 && checkedItems >= neededItems - coveredItems,
    };
  }, [groceryList]);

  return {
    groceryList,
    sections,
    stats,
    isLoading,
    error: mealPlanError,
    isEmpty: groceryList.length === 0,
    hasNeededItems: stats.neededItems > 0,
  };
}

/**
 * Hook to get the count of grocery items that need to be purchased
 *
 * @returns Object containing the count of needed items and loading state
 *
 * @remarks
 * Useful for displaying a badge count on UI elements.
 * Returns the number of items that are not fully covered by pantry stock.
 */
export function useGroceryItemCount() {
  const { stats, isLoading } = useGroceryList();

  return {
    count: stats.neededItems,
    isLoading,
  };
}
