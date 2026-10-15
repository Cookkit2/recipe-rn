import { Model } from "@nozbe/watermelondb";
import { field, date } from "@nozbe/watermelondb/decorators";
import type { LeftoverStatus } from "~/types/Leftover";

export default class Leftover extends Model {
  static table = "leftover";
  @field("name") name!: string;
  @field("servings") servings!: number;
  @date("cooked_at") cookedAt!: Date;
  @field("recipe_id") recipeId!: string | null;
  @field("remind_at") remindAtMs!: number | null;
  @field("status") status!: LeftoverStatus;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
}
