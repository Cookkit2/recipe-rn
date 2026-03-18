/**
 * CookkitToolExecutor - Implementation of ToolExecutor interface
 *
 * This class connects Function Gemma tool calls to DoneDish's existing
 * data layer (WatermelonDB and Supabase)
 */

import type { ToolExecutor } from "./FunctionGemmaService";
import { Q } from "@nozbe/watermelondb";
import { database } from "~/data/db/database";
import Stock from "~/data/db/models/Stock";
import GroceryItemCheck from "~/data/db/models/GroceryItemCheck";
import { recipeApi } from "~/data/supabase-api/RecipeApi";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";
import { queryClient } from "~/store/QueryProvider";
import { pantryQueryKeys } from "~/hooks/queries/pantryQueryKeys";
import {
  scheduleNotification,
  getNotificationPermissions,
  requestNotificationPermissions,
} from "~/lib/notifications";

// Typed collection helpers
const stockCollection = () => database.collections.get<Stock>("stock");
const groceryCollection = () => database.collections.get<GroceryItemCheck>("grocery_item_check");

/**
 * Implementation of tool executor for DoneDish features
 */

/**
 * Helper to wrap tool execution with common error handling
 */
async function executeTool<T>(name: string, fn: () => Promise<T>): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[CookkitToolExecutor] ${name} error:`, error);
    return {
      success: false,
      error: String(error),
    };
  }
}

export class CookkitToolExecutor implements ToolExecutor {
  // ============================================================================
  // INVENTORY MANAGEMENT
  // ============================================================================

  async addItem(params: any): Promise<any> {
    console.log("[CookkitToolExecutor] addItem called:", params);
    return executeTool("addItem", async () => {
      const { name, quantity, unit, location, expiry_date } = params;

      const newStock = await database.write(async () => {
        return stockCollection().create((record) => {
          record.name = name;
          record.quantity = quantity ?? 1;
          record.unit = unit ?? "piece";
          record.storageType = location || "fridge";
          record._expiryDate = expiry_date ? new Date(expiry_date).getTime() : undefined;
        });
      });

      // Invalidate React Query cache so the pantry UI refreshes
      queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all });

      const result = {
        success: true,
        ingredient: { id: newStock.id, name: newStock.name },
        message: `Added ${quantity ?? 1} ${unit ?? "piece"} of ${name} to ${location || "fridge"}`,
      };
      console.log("[CookkitToolExecutor] addItem success:", result);
      return result;
    });
  }

  async removeItem(params: any): Promise<any> {
    return executeTool("removeItem", async () => {
      const { item_id, quantity } = params;

      const stock = await stockCollection().find(item_id);
      if (!stock) {
        return {
          success: false,
          error: "Item not found in inventory",
        };
      }

      if (quantity && quantity < stock.quantity) {
        // Partial removal — reduce quantity
        await stock.updateStock({ quantity: stock.quantity - quantity });
        queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all });
        return {
          success: true,
          message: `Removed ${quantity} ${stock.unit} of ${stock.name}`,
        };
      } else {
        // Full removal (delete)
        await database.write(async () => {
          await stock.markAsDeleted();
        });
        queryClient.invalidateQueries({ queryKey: pantryQueryKeys.all });
        return {
          success: true,
          message: `Removed all ${stock.name} from inventory`,
        };
      }
    });
  }

  async getInventory(params: any = {}): Promise<any> {
    return executeTool("getInventory", async () => {
      const { location } = params;

      let items: Stock[];
      if (location && location !== "all") {
        items = await stockCollection().query(Q.where("storage_type", location)).fetch();
      } else {
        items = await stockCollection().query().fetch();
      }

      return {
        success: true,
        count: items.length,
        items: items.map((item: Stock) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          storage_type: item.storageType,
          expiry_date: item.expiryDate ? item.expiryDate.toISOString() : null,
        })),
      };
    });
  }

  // ============================================================================
  // EXPIRATION TRACKING
  // ============================================================================

  async getExpiringItems(params: any = {}): Promise<any> {
    return executeTool("getExpiringItems", async () => {
      const { days_ahead = 3 } = params;
      const now = Date.now();
      const expiryThreshold = now + days_ahead * 24 * 60 * 60 * 1000;

      const expiring = await stockCollection()
        .query(
          Q.where("expiry_date", Q.notEq(null)),
          Q.where("expiry_date", Q.lte(expiryThreshold)),
          Q.sortBy("expiry_date", Q.asc)
        )
        .fetch();

      return {
        success: true,
        count: expiring.length,
        items: expiring.map((item: Stock) => {
          const expiryTimestamp = item._expiryDate ?? 0;
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            expiry_date: item.expiryDate ? item.expiryDate.toISOString() : null,
            days_until_expiry: Math.ceil((expiryTimestamp - now) / (24 * 60 * 60 * 1000)),
          };
        }),
      };
    });
  }

  async setExpiryAlert(params: any): Promise<any> {
    return executeTool("setExpiryAlert", async () => {
      const { item_id, alert_time } = params;

      const stock = await stockCollection().find(item_id);
      if (!stock) {
        return {
          success: false,
          error: "Item not found in inventory",
        };
      }

      // alert_time format: "YYYY-MM-DD HH:MM"
      // Convert to a valid Date object string safely
      const alertDate = new Date(alert_time.replace(" ", "T") + ":00");

      if (isNaN(alertDate.getTime())) {
        return {
          success: false,
          error: `Invalid alert time format: ${alert_time}`,
        };
      }

      if (alertDate.getTime() <= Date.now()) {
        return {
          success: false,
          error: "Alert time must be in the future",
        };
      }

      const { granted } = await getNotificationPermissions();
      if (!granted) {
        await requestNotificationPermissions();
      }

      await scheduleNotification({
        id: `expiry-alert-${item_id}-${Date.now()}`,
        title: "Expiry Alert",
        body: `Your ${stock.name} is expiring soon!`,
        trigger: { date: alertDate },
      });

      return {
        success: true,
        message: `Alert set for ${stock.name} at ${alert_time}`,
      };
    });
  }

  // ============================================================================
  // GROCERY LIST
  // ============================================================================

  async addToGroceryList(params: any): Promise<any> {
    return executeTool("addToGroceryList", async () => {
      const { name, quantity } = params;

      // The grocery list is meal-plan-based (derived from planned recipes).
      // Standalone grocery items are not supported in the current architecture.
      // Redirect to addItem (pantry) so the user's food is still tracked.
      console.log(
        "[CookkitToolExecutor] addToGroceryList redirecting to addItem (pantry) for:",
        name
      );

      const result = await this.addItem({
        name,
        quantity: quantity ?? 1,
        unit: "piece",
        location: "fridge",
      });

      return {
        ...result,
        message: `Added ${quantity ?? 1} ${name} to your pantry. (The grocery list is built from meal plan recipes.)`,
      };
    });
  }

  async getGroceryList(params: any = {}): Promise<any> {
    return executeTool("getGroceryList", async () => {
      const items = await groceryCollection()
        .query(Q.where("is_deleted", Q.notEq(true)))
        .fetch();

      return {
        success: true,
        count: items.length,
        items: items.map((item: GroceryItemCheck) => ({
          id: item.id,
          name: item.ingredientName,
          checked: item.isChecked,
        })),
      };
    });
  }

  // ============================================================================
  // RECIPE & MEAL PLANNING
  // ============================================================================

  async findRecipes(params: any): Promise<any> {
    return executeTool("findRecipes", async () => {
      // Fetch all recipes from Supabase and filter client-side
      const allRecipes = await recipeApi.getAllRecipes();

      // If ingredients are specified, filter by matching recipe titles/descriptions
      const { ingredients } = params;
      let filtered = allRecipes;
      if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
        const lowerIngredients = ingredients.map((i: string) => i.toLowerCase());
        filtered = allRecipes.filter((recipe) => {
          const titleLower = recipe.title?.toLowerCase() ?? "";
          const descLower = recipe.description?.toLowerCase() ?? "";
          return lowerIngredients.some(
            (ing: string) => titleLower.includes(ing) || descLower.includes(ing)
          );
        });
      }

      return {
        success: true,
        count: filtered.length,
        recipes: filtered.slice(0, 10).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          prep_minutes: r.prep_minutes,
          cook_minutes: r.cook_minutes,
        })),
      };
    });
  }

  async suggestMeals(params: any = {}): Promise<any> {
    return executeTool("suggestMeals", async () => {
      // Get current inventory
      const inventoryResult = await this.getInventory();
      if (!inventoryResult.success) {
        return inventoryResult;
      }

      // Use inventory items to search for matching recipes
      const ingredientNames = inventoryResult.items.map((item: any) => item.name);

      // Find recipes that match current ingredients
      const recipesResult = await this.findRecipes({ ingredients: ingredientNames });

      return {
        success: true,
        based_on_inventory: ingredientNames,
        suggestions: recipesResult.recipes ?? [],
      };
    });
  }

  // ============================================================================
  // PRODUCT IDENTIFICATION
  // ============================================================================

  async scanBarcode(params: any): Promise<any> {
    return executeTool("scanBarcode", async () => {
      const { barcode } = params;

      // Look up ingredient by name via Supabase base ingredient data
      const productInfo = await baseIngredientApi.getBaseIngredientByName(barcode);

      if (!productInfo) {
        return {
          success: false,
          error: `No product found for barcode: ${barcode}`,
        };
      }

      return {
        success: true,
        product: productInfo,
      };
    });
  }
}
