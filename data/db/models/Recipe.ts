import { Model } from "@nozbe/watermelondb";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

export interface RecipeData {
  title: string;
  description: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  sourceUrl?: string;
  calories?: number;
  tags?: string[];
}

export default class Recipe extends Model {
  static table = "recipes";
  static associations: Associations = {
    recipe_steps: { type: "has_many", foreignKey: "recipe_id" },
    recipe_ingredients: { type: "has_many", foreignKey: "recipe_id" },
  };

  @field("title") title!: string;
  @field("description") description!: string;
  @field("image_url") imageUrl?: string;
  @field("prep_minutes") prepMinutes!: number;
  @field("cook_minutes") cookMinutes!: number;
  @field("difficulty_stars") difficultyStars!: number;
  @field("servings") servings!: number;
  @field("source_url") sourceUrl?: string;
  @field("calories") calories?: number;
  @field("tags") _tags?: string; // JSON string

  @children("recipe_steps") steps: any; // Collection<RecipeStep>
  @children("recipe_ingredients") ingredients: any; // Collection<RecipeIngredient>

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for tags
  get tags(): string[] {
    return this._tags ? JSON.parse(this._tags) : [];
  }

  set tags(value: string[]) {
    this._tags = JSON.stringify(value);
  }

  // Computed property for total time
  get totalMinutes(): number {
    return this.prepMinutes + this.cookMinutes;
  }

  // Update method
  @writer async updateRecipe(data: Partial<RecipeData>): Promise<Recipe> {
    return this.update((recipe) => {
      if (data.title !== undefined) recipe.title = data.title;
      if (data.description !== undefined) recipe.description = data.description;
      if (data.imageUrl !== undefined) recipe.imageUrl = data.imageUrl;
      if (data.prepMinutes !== undefined) recipe.prepMinutes = data.prepMinutes;
      if (data.cookMinutes !== undefined) recipe.cookMinutes = data.cookMinutes;
      if (data.difficultyStars !== undefined)
        recipe.difficultyStars = data.difficultyStars;
      if (data.servings !== undefined) recipe.servings = data.servings;
      if (data.sourceUrl !== undefined) recipe.sourceUrl = data.sourceUrl;
      if (data.calories !== undefined) recipe.calories = data.calories;
      if (data.tags !== undefined) recipe.tags = data.tags;
    });
  }
}
