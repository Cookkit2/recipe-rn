import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import BaseIngredient from "./BaseIngredient";

export interface StepsToStoreData {
  title: string;
  description: string;
  sequence: number;
  ingredientId: string;
}

export default class StepsToStore extends Model {
  static table = "steps_to_store";
  static associations: Associations = {
    base_ingredients: { type: "belongs_to", key: "ingredient_id" },
  };

  @field("title") title!: string;
  @field("description") description!: string;
  @field("sequence") sequence!: number;
  @field("ingredient_id") ingredientId!: string;

  @relation("base_ingredients", "ingredient_id") ingredient!: BaseIngredient;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateStep(
    data: Partial<StepsToStoreData>
  ): Promise<StepsToStore> {
    return this.update((step) => {
      if (data.title !== undefined) step.title = data.title;
      if (data.description !== undefined) step.description = data.description;
      if (data.sequence !== undefined) step.sequence = data.sequence;
      if (data.ingredientId !== undefined)
        step.ingredientId = data.ingredientId;
    });
  }
}
