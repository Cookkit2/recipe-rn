import { Model } from "@nozbe/watermelondb";
import { field, date, relation } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type Recipe from "./Recipe";

export interface TailoredRecipeMappingData {
  hash: string;
  recipeId: string;
  expiryDatetime: number;
}

export default class TailoredRecipeMapping extends Model {
  static table = "tailored_recipe_mapping";
  static associations: Associations = {
    recipe: { type: "belongs_to", key: "recipe_id" },
  };

  @field("hash") hash!: string;
  @field("recipe_id") recipeId!: string;
  @field("expiry_datetime") expiryDatetime!: number;

  @relation("recipe", "recipe_id") recipe!: Recipe;

  @date("created_at") createdAt!: Date;

  // Check if the mapping has expired
  get isExpired(): boolean {
    return Date.now() > this.expiryDatetime;
  }

  // Get expiry as Date object
  get expiryDate(): Date {
    return new Date(this.expiryDatetime);
  }
}
