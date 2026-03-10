import { Model } from "@nozbe/watermelondb";
import { field, date, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

export interface RecipeVersionData {
  recipeId: string;
  versionNumber: number;
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
}

export default class RecipeVersion extends Model {
  static table = "recipe_version";
  static associations: Associations = {
    recipe: { type: "belongs_to", key: "recipe_id" },
  };

  @field("recipe_id") recipeId!: string;
  @field("version_number") versionNumber!: number;
  @field("title") title!: string;
  @field("description") description!: string;
  @field("prep_minutes") prepMinutes!: number;
  @field("cook_minutes") cookMinutes!: number;
  @field("difficulty_stars") difficultyStars!: number;
  @field("servings") servings!: number;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for total time
  get totalMinutes(): number {
    return this.prepMinutes + this.cookMinutes;
  }

  // Update method
  @writer async updateVersion(data: Partial<RecipeVersionData>): Promise<RecipeVersion> {
    return this.update((version) => {
      if (data.recipeId !== undefined) version.recipeId = data.recipeId;
      if (data.versionNumber !== undefined) version.versionNumber = data.versionNumber;
      if (data.title !== undefined) version.title = data.title;
      if (data.description !== undefined) version.description = data.description;
      if (data.prepMinutes !== undefined) version.prepMinutes = data.prepMinutes;
      if (data.cookMinutes !== undefined) version.cookMinutes = data.cookMinutes;
      if (data.difficultyStars !== undefined) version.difficultyStars = data.difficultyStars;
      if (data.servings !== undefined) version.servings = data.servings;
    });
  }
}
