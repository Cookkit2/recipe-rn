import { Model } from "@nozbe/watermelondb";
import { field, date, writer } from "@nozbe/watermelondb/decorators";

export interface GroceryItemCheckData {
  ingredientName: string;
  isChecked: boolean;
  isDeleted?: boolean;
}

export default class GroceryItemCheck extends Model {
  static table = "grocery_item_check";

  @field("ingredient_name") ingredientName!: string;
  @field("is_checked") isChecked!: boolean;
  @field("is_deleted") isDeleted!: boolean;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Toggle checked state
  @writer async toggleChecked(): Promise<GroceryItemCheck> {
    return this.update((record) => {
      record.isChecked = !record.isChecked;
    });
  }

  // Set deleted state
  @writer async setDeleted(deleted: boolean): Promise<GroceryItemCheck> {
    return this.update((record) => {
      record.isDeleted = deleted;
      // If deleting, also uncheck? Or keep check state?
      // Usually if we delete, we don't care about check state.
    });
  }

  // Update method
  @writer async updateGroceryItemCheck(
    data: Partial<GroceryItemCheckData>
  ): Promise<GroceryItemCheck> {
    return this.update((record) => {
      if (data.ingredientName !== undefined) record.ingredientName = data.ingredientName;
      if (data.isChecked !== undefined) record.isChecked = data.isChecked;
      if (data.isDeleted !== undefined) record.isDeleted = data.isDeleted;
    });
  }
}
