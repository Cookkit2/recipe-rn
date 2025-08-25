/**
 * RecipeStep Model for WatermelonDB
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

export interface RecipeStepModel extends BaseModelInterface {
  recipe_id: string;
  step: number;
  title: string;
  description: string;
  related_ingredient_ids?: string[]; // Will be stored as JSON string in DB
  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;
}

export class RecipeStep extends Model implements RecipeStepModel {
  static table = 'recipe_steps';
  
  static associations = {
    recipe: { type: 'belongs_to' as const, key: 'recipe_id' },
  };

  recipe_id!: string;
  step!: number;
  title!: string;
  description!: string;
  created_at!: Date;
  updated_at!: Date;

  // Related ingredient IDs as JSON string in database
  private _related_ingredient_ids?: string;

  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;

  // Relations
  recipe: any; // Will be Relation<Recipe> when WatermelonDB is installed

  // Related ingredient IDs getter/setter
  get related_ingredient_ids(): string[] {
    if (!this._related_ingredient_ids) return [];
    try {
      return JSON.parse(this._related_ingredient_ids);
    } catch {
      return [];
    }
  }

  set related_ingredient_ids(ids: string[]) {
    this._related_ingredient_ids = JSON.stringify(ids);
  }

  // Custom methods
  async updateDescription(newDescription: string): Promise<RecipeStep> {
    return this.update((step: any) => {
      step.description = newDescription;
      step.updated_at = new Date();
    });
  }

  async addRelatedIngredient(ingredientId: string): Promise<RecipeStep> {
    return this.update((step: any) => {
      const currentIds = this.related_ingredient_ids;
      if (!currentIds.includes(ingredientId)) {
        step.related_ingredient_ids = JSON.stringify([...currentIds, ingredientId]);
        step.updated_at = new Date();
      }
    });
  }

  async removeRelatedIngredient(ingredientId: string): Promise<RecipeStep> {
    return this.update((step: any) => {
      const currentIds = this.related_ingredient_ids;
      step.related_ingredient_ids = JSON.stringify(currentIds.filter(id => id !== ingredientId));
      step.updated_at = new Date();
    });
  }

  async markForSync(): Promise<RecipeStep> {
    return this.update((step: any) => {
      step.sync_status = 'pending';
      step.updated_at = new Date();
    });
  }

  // Convert to your existing RecipeStep interface
  toPlainObject(): import('../../../types/Recipe').RecipeStep {
    return {
      step: this.step,
      title: this.title,
      description: this.description,
      relatedIngredientIds: this.related_ingredient_ids,
    };
  }
}

export default RecipeStep;
