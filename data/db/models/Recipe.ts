import { Model, Query } from "@nozbe/watermelondb";
import { safeJsonParse } from "~/utils/json-parsing";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type RecipeStep from "./RecipeStep";
import type RecipeIngredient from "./RecipeIngredient";
import type CookingHistory from "./CookingHistory";
import type ConsumptionLog from "./ConsumptionLog";
import type { NutritionSource } from "~/types/Nutrition";

export enum RecipeType {
  STANDARD = "standard",
  TAILORED = "tailored",
  CONVERTED = "converted",
}

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
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  allergens?: string[];
  nutritionSource?: NutritionSource;
  tags?: string[];
  isFavorite?: boolean;
  type?: RecipeType;
}

export default class Recipe extends Model {
  static table = "recipe";
  static associations: Associations = {
    recipe_step: { type: "has_many", foreignKey: "recipe_id" },
    recipe_ingredient: { type: "has_many", foreignKey: "recipe_id" },
    cooking_history: { type: "has_many", foreignKey: "recipe_id" },
    consumption_log: { type: "has_many", foreignKey: "recipe_id" },
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
  @field("protein") protein!: number | undefined;
  @field("carbs") carbs!: number | undefined;
  @field("fat") fat!: number | undefined;
  @field("fiber") fiber!: number | undefined;
  @field("allergens") _allergens?: string; // JSON string
  @field("nutrition_source") nutritionSource!: NutritionSource | undefined;
  @field("tags") _tags?: string; // JSON string
  @field("synced_at") syncedAt!: number; // NEW: Track last sync from cloud
  @field("is_favorite") isFavorite!: boolean; // NEW: User can favorite recipes
  @field("type") type?: RecipeType;

  @children("recipe_step") steps!: Query<RecipeStep>;
  @children("recipe_ingredient") ingredients!: Query<RecipeIngredient>;
  @children("cooking_history") cookingHistory!: Query<CookingHistory>;
  @children("consumption_log") consumptionLogs!: Query<ConsumptionLog>;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for tags
  get tags(): string[] {
    return safeJsonParse<string[]>(this._tags, []);
  }

  set tags(value: string[]) {
    this._tags = JSON.stringify(value);
  }

  // Computed property for allergens
  get allergens(): string[] {
    return safeJsonParse<string[]>(this._allergens, []);
  }

  set allergens(value: string[]) {
    this._allergens = JSON.stringify(value);
  }

  // Check if recipe has nutrition data
  get hasNutrition(): boolean {
    return (
      this.calories != null && (this.protein != null || this.carbs != null || this.fat != null)
    );
  }

  // Computed property for total time
  get totalMinutes(): number {
    return this.prepMinutes + this.cookMinutes;
  }

  // Computed property for synced at date
  get syncedAtDate(): Date {
    return new Date(this.syncedAt);
  }

  // Check if recipe needs sync (older than 24 hours)
  get needsSync(): boolean {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    return Date.now() - this.syncedAt > ONE_DAY_MS;
  }

  // Check if this is a tailored recipe
  get isTailored(): boolean {
    return this.type === RecipeType.TAILORED;
  }

  // Update method
  @writer async updateRecipe(data: Partial<RecipeData>): Promise<Recipe> {
    return this.update((recipe) => {
      if (data.title !== undefined) recipe.title = data.title;
      if (data.description !== undefined) recipe.description = data.description;
      if (data.imageUrl !== undefined) recipe.imageUrl = data.imageUrl;
      if (data.prepMinutes !== undefined) recipe.prepMinutes = data.prepMinutes;
      if (data.cookMinutes !== undefined) recipe.cookMinutes = data.cookMinutes;
      if (data.difficultyStars !== undefined) recipe.difficultyStars = data.difficultyStars;
      if (data.servings !== undefined) recipe.servings = data.servings;
      if (data.sourceUrl !== undefined) recipe.sourceUrl = data.sourceUrl;
      if (data.calories !== undefined) recipe.calories = data.calories;
      if (data.protein !== undefined) recipe.protein = data.protein;
      if (data.carbs !== undefined) recipe.carbs = data.carbs;
      if (data.fat !== undefined) recipe.fat = data.fat;
      if (data.fiber !== undefined) recipe.fiber = data.fiber;
      if (data.allergens !== undefined) recipe.allergens = data.allergens;
      if (data.nutritionSource !== undefined) recipe.nutritionSource = data.nutritionSource;
      if (data.tags !== undefined) recipe.tags = data.tags;
      if (data.isFavorite !== undefined) recipe.isFavorite = data.isFavorite;
      if (data.type !== undefined) recipe.type = data.type;
    });
  }

  // Toggle favorite status
  @writer async toggleFavorite(): Promise<Recipe> {
    return this.update((recipe) => {
      recipe.isFavorite = !recipe.isFavorite;
    });
  }
}
