/**
 * Recipe Model for WatermelonDB
 * 
 * Simplified version without decorators for TypeScript compliance
 * TODO: Add proper WatermelonDB decorators once configuration is resolved
 */

import type { BaseModelInterface } from '../types';

export interface RecipeModel extends BaseModelInterface {
  title: string;
  description: string;
  image_url: string;
  prep_minutes?: number;
  cook_minutes?: number;
  difficulty_stars?: number;
  servings?: number;
  source_url?: string;
  calories?: number;
  tags?: string[]; // Will be stored as JSON string in DB
  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;
}

export class Recipe implements RecipeModel {
  static table = 'recipes';
  
  static associations = {
    recipe_ingredients: { type: 'has_many' as const, foreignKey: 'recipe_id' },
    recipe_steps: { type: 'has_many' as const, foreignKey: 'recipe_id' },
    recipe_rack_items: { type: 'has_many' as const, foreignKey: 'recipe_id' },
  };

  // Model properties
  id!: string;
  title!: string;
  description!: string;
  image_url!: string;
  prep_minutes?: number;
  cook_minutes?: number;
  difficulty_stars?: number;
  servings?: number;
  source_url?: string;
  calories?: number;
  tags?: string[];
  
  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;
  
  // Base model fields
  created_at!: Date;
  updated_at!: Date;

  // Mock update method for TypeScript compliance
  update(updater: (model: any) => void): Promise<this> {
    return Promise.resolve(this);
  }

  // Mock toPlainObject method
  toPlainObject(): RecipeModel {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      image_url: this.image_url,
      prep_minutes: this.prep_minutes,
      cook_minutes: this.cook_minutes,
      difficulty_stars: this.difficulty_stars,
      servings: this.servings,
      source_url: this.source_url,
      calories: this.calories,
      tags: this.tags,
      server_id: this.server_id,
      sync_status: this.sync_status,
      last_synced_at: this.last_synced_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  // Computed properties
  get totalMinutes(): number | undefined {
    if (this.prep_minutes === undefined && this.cook_minutes === undefined) {
      return undefined;
    }
    return (this.prep_minutes || 0) + (this.cook_minutes || 0);
  }

  get difficultyText(): string {
    if (!this.difficulty_stars) return 'Unknown';
    if (this.difficulty_stars <= 1) return 'Easy';
    if (this.difficulty_stars <= 3) return 'Medium';
    return 'Hard';
  }

  get hasNutritionalInfo(): boolean {
    return this.calories !== undefined;
  }

  get needsSync(): boolean {
    return this.sync_status === 'pending';
  }

  // Tag helpers
  get tagsAsString(): string {
    return this.tags ? this.tags.join(', ') : '';
  }

  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }
}

// Default export for compatibility
export default Recipe;
