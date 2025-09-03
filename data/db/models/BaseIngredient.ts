import { Model } from "@nozbe/watermelondb";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

export interface BaseIngredientData {
  name: string;
  synonyms?: string[];
}

export default class BaseIngredient extends Model {
  static table = "base_ingredients";
  static associations: Associations = {
    recipe_ingredients: { type: "has_many", foreignKey: "base_ingredient_id" },
    stock: { type: "has_many", foreignKey: "base_ingredient_id" },
    steps_to_store: { type: "has_many", foreignKey: "ingredient_id" },
    ingredient_category_assignments: {
      type: "has_many",
      foreignKey: "ingredient_id",
    },
  };

  @field("name") name!: string;
  @field("synonyms") _synonyms?: string; // JSON string

  @children("recipe_ingredients") recipeIngredients: any; // Collection<RecipeIngredient>
  @children("stock") stockItems: any; // Collection<Stock>
  @children("steps_to_store") storageSteps: any; // Collection<StepsToStore>
  @children("ingredient_category_assignments") categoryAssignments: any; // Collection<IngredientCategoryAssignment>

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for synonyms
  get synonyms(): string[] {
    return this._synonyms ? JSON.parse(this._synonyms) : [];
  }

  set synonyms(value: string[]) {
    this._synonyms = JSON.stringify(value);
  }

  // Check if this ingredient matches a search term (including synonyms)
  matchesSearch(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    return (
      this.name.toLowerCase().includes(term) ||
      this.synonyms.some((synonym) => synonym.toLowerCase().includes(term))
    );
  }

  // Update method
  @writer async updateIngredient(
    data: Partial<BaseIngredientData>
  ): Promise<BaseIngredient> {
    return this.update((ingredient) => {
      if (data.name !== undefined) ingredient.name = data.name;
      if (data.synonyms !== undefined) ingredient.synonyms = data.synonyms;
    });
  }
}
