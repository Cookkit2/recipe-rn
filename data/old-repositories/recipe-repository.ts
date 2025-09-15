import type { RecipeRackItem } from "~/types/RecipeRackItem";
import { BaseRepository } from "./base-repository";
import { storageFacade } from "../storage";

const RECIPE_RACK_KEY = "recipeRackItems";

/**
 * Recipe repository using the new storage facade and base repository
 */
class RecipeRepository extends BaseRepository<RecipeRackItem> {
  constructor() {
    super(RECIPE_RACK_KEY, storageFacade);
  }

  /**
   * Get recipe by ID
   */
  getById(id: string): RecipeRackItem | null {
    return this.findFirst((item) => item.id === id);
  }

  /**
   * Get recipe by recipe ID
   */
  getByRecipeId(recipeId: string): RecipeRackItem | null {
    return this.findFirst((item) => item.recipeId === recipeId);
  }

  /**
   * Update an existing recipe item
   */
  update(item: RecipeRackItem): boolean {
    return this.updateWhere(
      (existing) => existing.id === item.id,
      () => ({ ...item, updated_at: new Date() })
    );
  }

  /**
   * Delete a recipe item by ID
   */
  delete(id: string): boolean {
    return this.deleteWhere((item) => item.id === id) > 0;
  }

  /**
   * Search recipes by title
   */
  searchByTitle(query: string): RecipeRackItem[] {
    const lowerQuery = query.toLowerCase();
    return this.findWhere((item) =>
      item.title.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Add a new recipe with automatic ID generation
   */
  addWithAutoId(
    itemData: Omit<RecipeRackItem, "id" | "created_at" | "updated_at">
  ): RecipeRackItem {
    const newItem: RecipeRackItem = {
      ...itemData,
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.add(newItem);
    return newItem;
  }

  /**
   * Update recipe position
   */
  updatePosition(id: string, x: number, y: number, scale: number): boolean {
    return this.updateWhere(
      (item) => item.id === id,
      (item) => ({ ...item, x, y, scale, updated_at: new Date() })
    );
  }

  /**
   * Get recipes sorted by creation date
   */
  getSortedByDate(ascending: boolean = false): RecipeRackItem[] {
    const items = this.getAll();
    return items.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Delete recipes by recipe IDs
   */
  deleteByRecipeIds(recipeIds: string[]): number {
    return this.deleteWhere((item) => recipeIds.includes(item.recipeId));
  }
}

// Create and export the repository instance
export const recipeRepository = new RecipeRepository();

// Export the class for testing or advanced usage
export { RecipeRepository };
