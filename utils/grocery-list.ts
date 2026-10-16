import type { MealPlanItemWithRecipe } from "~/data/api/mealPlanApi";
import { normalizeGroceryIngredientName } from "~/utils/grocery-ingredient-name";
import {
  convertToBaseUnit,
  areDimensionsCompatible,
  getUnitDimension,
  roundToReasonablePrecision,
} from "~/utils/unit-converter";
import { compareQuantities } from "~/utils/quantity-comparison";
import { log } from "~/utils/logger";

/**
 * Grocery category for organizing items
 */
export type GroceryCategory = "produce" | "dairy" | "meat" | "pantry" | "other" | "purchased";

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

// Pre-allocate active categories and precompile regexes to avoid
// Object.entries and O(M*N) string matching overhead on every call.
const ACTIVE_CATEGORY_REGEXES = (Object.entries(CATEGORY_KEYWORDS) as [GroceryCategory, string[]][])
  .filter(([category]) => category !== "other" && category !== "purchased")
  .map(([category, keywords]) => {
    const validKeywords = keywords
      .filter((k) => k && k.length > 0)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    // If a category has no valid keywords, return a regex that never matches anything
    const regex = validKeywords.length > 0 ? new RegExp(validKeywords.join("|"), "i") : /(?!)/;

    return {
      category,
      regex,
    };
  });

/**
 * Categorizes an ingredient based on its name
 *
 * @param name - The ingredient name to categorize
 * @returns The grocery category for this ingredient
 *
 * @remarks
 * Uses precompiled regex matching to determine category efficiently.
 * Returns "other" if no matching keywords are found.
 */
function categorizeIngredient(name: string): GroceryCategory {
  for (let i = 0; i < ACTIVE_CATEGORY_REGEXES.length; i++) {
    const entry = ACTIVE_CATEGORY_REGEXES[i];
    if (entry && entry.regex.test(name)) {
      return entry.category;
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
  return normalizeGroceryIngredientName(name);
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

  if (unit1.toLowerCase().trim() === unit2.toLowerCase().trim())
    return { quantity: Number((qty1 + qty2).toPrecision(10)), unit: unit1, canCombine: true };
  if (!areDimensionsCompatible(unit1, unit2))
    return { quantity: qty1, unit: unit1, canCombine: false };

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

/**
 * Type definitions for helper functions to maintain strict typing
 * without needing to import large external models.
 */
interface AggregatedIngredient {
  name: string;
  totalQuantity: number;
  unit: string;
  fromRecipes: string[];
}

/**
 * Step 1: Aggregates ingredients from planned recipes.
 */
export function aggregateRecipeIngredients(
  mealPlanItems: MealPlanItemWithRecipe[]
): Map<string, AggregatedIngredient> {
  const ingredientMap = new Map<string, AggregatedIngredient>();

  for (const mealPlanItem of mealPlanItems) {
    if (!mealPlanItem.recipe) continue;

    const recipe = mealPlanItem.recipe;
    const servingsMultiplier = mealPlanItem.servings / (recipe.servings || 1);

    for (const ingredient of recipe.ingredients) {
      let normalizedName = normalizeIngredientName(ingredient.name);
      const scaledQuantity = ingredient.quantity * servingsMultiplier;
      if (!Number.isFinite(scaledQuantity) || scaledQuantity <= 0) continue;
      const first = ingredientMap.get(normalizedName);
      if (
        first &&
        first.unit.toLowerCase().trim() !== ingredient.unit.toLowerCase().trim() &&
        !areDimensionsCompatible(first.unit, ingredient.unit)
      )
        normalizedName += `::${getUnitDimension(ingredient.unit) ?? ingredient.unit.toLowerCase().trim()}`;

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
          log.warn("Incompatible units when combining ingredient in grocery list:", {
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

  return ingredientMap;
}

/**
 * Builds a pre-computed index mapping normalized names and synonyms to an array of matching pantry items.
 */
function buildPantryIndex(pantryItems: any[] | null | undefined): Map<string, any[]> {
  const index = new Map<string, any[]>();

  if (!pantryItems) return index;

  const seenIds = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const pantryItem of pantryItems) {
    if (!Number.isFinite(pantryItem.quantity) || pantryItem.quantity <= 0) continue;
    if (pantryItem.expiry_date && new Date(pantryItem.expiry_date).getTime() < today.getTime())
      continue;
    if (pantryItem.id && seenIds.has(pantryItem.id)) continue;
    if (pantryItem.id) seenIds.add(pantryItem.id);
    const normalizedName = normalizeGroceryIngredientName(pantryItem.name);

    if (!index.has(normalizedName)) {
      index.set(normalizedName, []);
    }
    index.get(normalizedName)!.push(pantryItem);

    if (pantryItem.synonyms && pantryItem.synonyms.length > 0) {
      for (const synonymEntry of pantryItem.synonyms) {
        // Handle both string and object synonym forms gracefully
        const synonymText = typeof synonymEntry === "string" ? synonymEntry : synonymEntry.synonym;
        if (!synonymText) continue;

        const normalizedSynonym = normalizeGroceryIngredientName(synonymText);

        if (!index.has(normalizedSynonym)) {
          index.set(normalizedSynonym, []);
        }
        // Avoid duplicate items in the same normalized bucket
        if (!index.get(normalizedSynonym)!.includes(pantryItem)) {
          index.get(normalizedSynonym)!.push(pantryItem);
        }
      }
    }
  }

  return index;
}

/**
 * Step 2: Calculates needed quantities by subtracting pantry stock.
 */
export function calculateNeededQuantities(
  ingredientMap: Map<string, AggregatedIngredient>,
  pantryItems: any[] | null | undefined,
  attributesMap: Record<string, { isChecked: boolean; isDeleted: boolean }> | null | undefined
): GroceryItem[] {
  const groceryItems: GroceryItem[] = [];

  // O(N*M) Optimization: Build an O(1) index of pantry items for direct/synonym matches
  const pantryIndex = buildPantryIndex(pantryItems);
  const remainingStock = new Map<object, number>();

  for (const [normalizedName, ingredient] of ingredientMap) {
    const matchingPantryItems =
      pantryIndex.get(normalizeGroceryIngredientName(ingredient.name)) ?? [];
    let totalPantryQuantity = 0;
    for (const stock of matchingPantryItems) {
      const available = remainingStock.get(stock) ?? stock.quantity;
      if (available <= 0) continue;
      const inRecipeUnits =
        stock.unit.toLowerCase().trim() === ingredient.unit.toLowerCase().trim()
          ? available
          : (compareQuantities(available, stock.unit, ingredient.totalQuantity, ingredient.unit)
              .availableInRequiredUnits ?? 0);
      if (inRecipeUnits <= 0) continue;
      const used = Math.min(
        inRecipeUnits,
        Math.max(0, ingredient.totalQuantity - totalPantryQuantity)
      );
      totalPantryQuantity += used;
      remainingStock.set(stock, Math.max(0, available - (used / inRecipeUnits) * available));
    }
    const neededQuantity = Number(
      Math.max(0, ingredient.totalQuantity - totalPantryQuantity).toPrecision(10)
    );
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
}

/**
 * Step 3: Groups grocery items into organized sections.
 */
export function groupGroceryItemsIntoSections(groceryList: GroceryItem[]): GroceryListSection[] {
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
    if (item.isCovered) continue;
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
  const categoryOrder: GroceryCategory[] = [
    "produce",
    "dairy",
    "meat",
    "pantry",
    "other",
    "purchased",
  ];
  return sections.sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  );
}

/**
 * Step 4: Computes statistics for the grocery list.
 */
export function computeGroceryStats(groceryList: GroceryItem[]) {
  // ⚡ Bolt Performance Optimization: Replaced multiple filter.length calls with a single for loop to avoid O(3N) iteration and intermediate array allocations.
  const totalItems = groceryList.length;
  let neededItems = 0;
  let checkedItems = 0;
  let coveredItems = 0;

  for (let i = 0; i < totalItems; i++) {
    const item = groceryList[i];
    if (item) {
      if (!item.isCovered) neededItems++;
      if (item.isChecked && !item.isCovered) checkedItems++;
      if (item.isCovered) coveredItems++;
    }
  }

  return {
    totalItems,
    neededItems,
    checkedItems,
    coveredItems,
    allCheckedOrCovered: groceryList.length > 0 && checkedItems === neededItems,
  };
}
