import { Q } from "@nozbe/watermelondb";
import BaseIngredient, {
  type BaseIngredientData,
} from "../models/BaseIngredient";
import IngredientCategoryAssignment from "../models/IngredientCategoryAssignment";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface IngredientSearchOptions extends SearchOptions {
  categoryIds?: string[];
  includeSynonyms?: boolean;
}

export class BaseIngredientRepository extends BaseRepository<BaseIngredient> {
  constructor() {
    super("base_ingredients");
  }

  // Search ingredients by name (including synonyms)
  async searchIngredients(
    options: IngredientSearchOptions = {}
  ): Promise<BaseIngredient[]> {
    let query = this.collection.query();

    // Text search including synonyms
    if (options.searchTerm) {
      const searchFields =
        options.includeSynonyms !== false ? ["name", "synonyms"] : ["name"];
      query = this.buildSearchQuery(query, options.searchTerm, searchFields);
    }

    // Filter by categories
    if (options.categoryIds && options.categoryIds.length > 0) {
      // Get ingredient IDs that belong to these categories
      const assignmentsCollection =
        database.collections.get<IngredientCategoryAssignment>(
          "ingredient_category_assignments"
        );
      const assignments = await assignmentsCollection
        .query(Q.where("category_id", Q.oneOf(options.categoryIds)))
        .fetch();

      const ingredientIds = [
        ...new Set(assignments.map((a) => a.ingredientId)),
      ];

      if (ingredientIds.length > 0) {
        query = query.extend(Q.where("id", Q.oneOf(ingredientIds)));
      } else {
        // No ingredients in these categories
        return [];
      }
    }

    // Apply sorting
    query = this.applySorting(
      query,
      options.sortBy || "name",
      options.sortOrder || "asc"
    );

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Find ingredient by exact name match
  async findByName(name: string): Promise<BaseIngredient | null> {
    const results = await this.collection
      .query(Q.where("name", Q.eq(name)))
      .fetch();

    return results[0] || null;
  }

  // Find ingredients that match search term (including synonyms)
  async findMatching(searchTerm: string): Promise<BaseIngredient[]> {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    const ingredients = await this.collection.query().fetch();

    return ingredients.filter((ingredient) =>
      ingredient.matchesSearch(normalizedSearch)
    );
  }

  // Get ingredient with categories
  async getIngredientWithCategories(id: string): Promise<{
    ingredient: BaseIngredient;
    categories: string[];
  } | null> {
    try {
      const ingredient = await this.findById(id);
      if (!ingredient) return null;

      const assignments = await ingredient.categoryAssignments?.query().fetch();

      if (!assignments) return null;

      const categories = assignments.map(
        (assignment) => assignment.category.name
      );
      
      return {
        ingredient,
        categories,
      };
    } catch (error) {
      console.error("Error fetching ingredient with categories:", error);
      return null;
    }
  }

  // Assign ingredient to categories
  async assignToCategories(
    ingredientId: string,
    categoryIds: string[]
  ): Promise<void> {
    await database.write(async () => {
      const assignmentsCollection =
        database.collections.get<IngredientCategoryAssignment>(
          "ingredient_category_assignments"
        );

      // Remove existing assignments
      const existingAssignments = await assignmentsCollection.query().fetch();
      const toRemove = existingAssignments.filter(
        (a) => (a as any).ingredientId === ingredientId
      );

      await Promise.all(
        toRemove.map((assignment) => assignment.destroyPermanently())
      );

      // Create new assignments
      await Promise.all(
        categoryIds.map((categoryId) =>
          assignmentsCollection.create((assignment: any) => {
            assignment.ingredientId = ingredientId;
            assignment.categoryId = categoryId;
          })
        )
      );
    });
  }

  // Get ingredients by category
  async getIngredientsByCategory(
    categoryId: string
  ): Promise<BaseIngredient[]> {
    const assignmentsCollection =
      database.collections.get<IngredientCategoryAssignment>(
        "ingredient_category_assignments"
      );
    const assignments = await assignmentsCollection
      .query(Q.where("category_id", categoryId))
      .fetch();

    const ingredientIds = assignments.map((a) => a.ingredientId);

    if (ingredientIds.length === 0) return [];

    return await this.collection
      .query(Q.where("id", Q.oneOf(ingredientIds)))
      .fetch();
  }

  // Create ingredient with synonyms
  async createWithSynonyms(
    name: string,
    synonyms: string[] = []
  ): Promise<BaseIngredient> {
    return await this.create({
      name,
      synonyms,
    } as BaseIngredientData);
  }

  // Add synonym to existing ingredient
  async addSynonym(
    ingredientId: string,
    synonym: string
  ): Promise<BaseIngredient> {
    return await database.write(async () => {
      const ingredient = await this.collection.find(ingredientId);
      return await ingredient.update((r: any) => {
        const currentSynonyms = r.synonyms || [];
        if (!currentSynonyms.includes(synonym)) {
          r.synonyms = [...currentSynonyms, synonym];
        }
      });
    });
  }

  // Remove synonym from ingredient
  async removeSynonym(
    ingredientId: string,
    synonym: string
  ): Promise<BaseIngredient> {
    return await database.write(async () => {
      const ingredient = await this.collection.find(ingredientId);
      return await ingredient.update((r: any) => {
        r.synonyms = (r.synonyms || []).filter((s: string) => s !== synonym);
      });
    });
  }
}
