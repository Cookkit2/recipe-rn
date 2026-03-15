import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Recipe from "./Recipe";

export interface CookingHistoryData {
  recipeId: string;
  cookedAt?: number;
  rating?: number;
  notes?: string;
  servingsMade?: number;
  photoUrl?: string;
}

export default class CookingHistory extends Model {
  static table = "cooking_history";
  static associations: Associations = {
    recipe: { type: "belongs_to", key: "recipe_id" },
  };

  @field("recipe_id") recipeId!: string;
  @field("cooked_at") cookedAt!: number; // Timestamp
  @field("rating") rating?: number; // 1-5 stars
  @field("notes") notes?: string; // User's cooking notes/modifications
  @field("servings_made") servingsMade?: number; // Actual servings prepared
  @field("photo_url") photoUrl?: string; // Local file path to photo

  @relation("recipe", "recipe_id") recipe!: Recipe;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for cooked at date
  get cookedAtDate(): Date {
    return new Date(this.cookedAt);
  }

  // Check if rating is valid (1-5)
  get hasValidRating(): boolean {
    return this.rating !== undefined && this.rating >= 1 && this.rating <= 5;
  }

  // Check if has photo
  get hasPhoto(): boolean {
    return !!this.photoUrl;
  }

  // Check if has notes
  get hasNotes(): boolean {
    return !!this.notes && this.notes.trim().length > 0;
  }

  // Format cooked at date for display
  get formattedCookedAt(): string {
    const date = this.cookedAtDate;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }

  // Update method
  @writer async updateCookingHistory(data: Partial<CookingHistoryData>): Promise<CookingHistory> {
    return this.update((record) => {
      if (data.recipeId !== undefined) record.recipeId = data.recipeId;
      if (data.cookedAt !== undefined) record.cookedAt = data.cookedAt;
      if (data.rating !== undefined) record.rating = data.rating;
      if (data.notes !== undefined) record.notes = data.notes;
      if (data.servingsMade !== undefined) record.servingsMade = data.servingsMade;
      if (data.photoUrl !== undefined) record.photoUrl = data.photoUrl;
    });
  }
}
