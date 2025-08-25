/**
 * RecipeIngredient Model for WatermelonDB
 */

import type { BaseModelInterface } from '../types';

// Temporary base class for development
class Model {
  id!: string;
  static table = '';
  static associations = {};
  
  update(updater: (model: any) => void): Promise<any> {
    return Promise.resolve(this);
  }
}

export interface RecipeIngredientModel extends BaseModelInterface {
  recipe_id: string;
  name: string;
  related_ingredient_id?: string;
  quantity: string;
  notes?: string;
  order_index: number;
  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;
}

export class RecipeIngredient extends Model implements RecipeIngredientModel {
  static table = 'recipe_ingredients';
  
  static associations = {
    recipe: { type: 'belongs_to' as const, key: 'recipe_id' },
  };

  recipe_id!: string;
  name!: string;
  related_ingredient_id?: string;
  quantity!: string;
  notes?: string;
  order_index!: number;
  created_at!: Date;
  updated_at!: Date;

  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;

  // Relations
  recipe: any; // Will be Relation<Recipe> when WatermelonDB is installed

  // Custom methods
  async updateQuantity(newQuantity: string): Promise<RecipeIngredient> {
    return this.update((ingredient: any) => {
      ingredient.quantity = newQuantity;
      ingredient.updated_at = new Date();
    });
  }

  async linkToPantryItem(pantryItemId: string): Promise<RecipeIngredient> {
    return this.update((ingredient: any) => {
      ingredient.related_ingredient_id = pantryItemId;
      ingredient.updated_at = new Date();
    });
  }

  async markForSync(): Promise<RecipeIngredient> {
    return this.update((ingredient: any) => {
      ingredient.sync_status = 'pending';
      ingredient.updated_at = new Date();
    });
  }

  // Convert to your existing RecipeIngredient interface
  toPlainObject(): import('../../../types/Recipe').RecipeIngredient {
    return {
      name: this.name,
      relatedIngredientId: this.related_ingredient_id || '',
      quantity: this.quantity,
      notes: this.notes,
    };
  }
}

export default RecipeIngredient;
