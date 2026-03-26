import { Q } from "@nozbe/watermelondb";
import RecipeVersion, { type RecipeVersionData } from "../models/RecipeVersion";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface RecipeVersionSearchOptions extends SearchOptions {
  recipeId?: string;
  minVersionNumber?: number;
  maxVersionNumber?: number;
}

export class RecipeVersionRepository extends BaseRepository<RecipeVersion> {
  constructor() {
    super("recipe_version");
  }

  // Get all versions for a specific recipe, ordered by version number
  async getVersionsForRecipe(
    recipeId: string,
    options: SearchOptions = {}
  ): Promise<RecipeVersion[]> {
    let query = this.collection.query(Q.where("recipe_id", recipeId));

    // Apply sorting - default to version number descending (newest first)
    query = this.applySorting(
      query,
      options.sortBy || "version_number",
      options.sortOrder || "desc"
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

  // Get the latest version for a specific recipe
  async getLatestVersion(recipeId: string): Promise<RecipeVersion | null> {
    const versions = await this.getVersionsForRecipe(recipeId, { limit: 1 });
    const [latest] = versions;
    return latest ?? null;
  }

  // Get a specific version for a recipe
  async getVersionByNumber(recipeId: string, versionNumber: number): Promise<RecipeVersion | null> {
    try {
      const versions = await this.collection
        .query(Q.where("recipe_id", recipeId), Q.where("version_number", versionNumber))
        .fetch();

      const [version] = versions;
      return version ?? null;
    } catch {
      return null;
    }
  }

  // Search recipe versions with filters
  async searchVersions(options: RecipeVersionSearchOptions = {}): Promise<RecipeVersion[]> {
    let query = this.collection.query();

    // Filter by recipe ID
    if (options.recipeId) {
      query = query.extend(Q.where("recipe_id", options.recipeId));
    }

    // Filter by version number range
    if (options.minVersionNumber) {
      query = query.extend(Q.where("version_number", Q.gte(options.minVersionNumber)));
    }
    if (options.maxVersionNumber) {
      query = query.extend(Q.where("version_number", Q.lte(options.maxVersionNumber)));
    }

    // Text search
    if (options.searchTerm) {
      query = this.buildSearchQuery(query, options.searchTerm, ["title", "description"]);
    }

    // Apply sorting
    query = this.applySorting(
      query,
      options.sortBy || "version_number",
      options.sortOrder || "desc"
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

  // Create a new version for a recipe
  async createVersion(data: RecipeVersionData): Promise<RecipeVersion> {
    return await database.write(async () => {
      return await this.createVersionRaw(data);
    });
  }

  // Raw create method that works within existing transactions
  async createVersionRaw(data: RecipeVersionData): Promise<RecipeVersion> {
    return await this.collection.create((version) => {
      version.recipeId = data.recipeId;
      version.versionNumber = data.versionNumber;
      version.title = data.title;
      version.description = data.description;
      version.prepMinutes = data.prepMinutes;
      version.cookMinutes = data.cookMinutes;
      version.difficultyStars = data.difficultyStars;
      version.servings = data.servings;
    });
  }

  // Update an existing version
  async updateVersion(id: string, data: Partial<RecipeVersionData>): Promise<RecipeVersion> {
    return await database.write(async () => {
      const version = await this.findById(id);
      if (!version) {
        throw new Error(`RecipeVersion with id ${id} not found`);
      }
      return await version.updateVersion(data);
    });
  }

  // Delete a specific version
  async deleteVersion(id: string): Promise<void> {
    await this.delete(id);
  }

  // Delete all versions for a specific recipe
  async deleteVersionsForRecipe(recipeId: string): Promise<void> {
    await database.write(async () => {
      const versions = await this.getVersionsForRecipe(recipeId);
      await database.batch(...versions.map((version) => version.prepareDestroyPermanently()));
    });
  }
    });
  }

  // Get the total number of versions for a recipe
  async countVersionsForRecipe(recipeId: string): Promise<number> {
    return await this.collection.query(Q.where("recipe_id", recipeId)).fetchCount();
  }

  // Get the next version number for a recipe
  async getNextVersionNumber(recipeId: string): Promise<number> {
    const latestVersion = await this.getLatestVersion(recipeId);
    return latestVersion ? latestVersion.versionNumber + 1 : 1;
  }
}
