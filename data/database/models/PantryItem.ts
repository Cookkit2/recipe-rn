/**
 * PantryItem Model for WatermelonDB
 * 
 * Simplified version without decorators for TypeScript compliance
 * TODO: Add proper WatermelonDB decorators once configuration is resolved
 */

import type { BaseModelInterface } from '../types';
import type { ItemType } from '../../../types/PantryItem';

// Model interface that matches your existing PantryItem type
export interface PantryItemModel extends BaseModelInterface {
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  category: string;
  type: Exclude<ItemType, "all">;
  image_url: string;
  x: number;
  y: number;
  scale: number;
  // Sync fields
  server_id?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_synced_at?: Date;
}

// Simplified class for TypeScript compliance
export class PantryItem implements PantryItemModel {
  static table = 'pantry_items';
  
  // Model properties
  id!: string;
  name!: string;
  quantity!: number;
  unit!: string;
  expiry_date?: Date;
  category!: string;
  type!: Exclude<ItemType, "all">;
  image_url!: string;
  x!: number;
  y!: number;
  scale!: number;
  
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

  // Mock toPlainObject method that's used in examples
  toPlainObject(): PantryItemModel {
    return {
      id: this.id,
      name: this.name,
      quantity: this.quantity,
      unit: this.unit,
      expiry_date: this.expiry_date,
      category: this.category,
      type: this.type,
      image_url: this.image_url,
      x: this.x,
      y: this.y,
      scale: this.scale,
      server_id: this.server_id,
      sync_status: this.sync_status,
      last_synced_at: this.last_synced_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  // Computed properties
  get isExpired(): boolean {
    if (!this.expiry_date) return false;
    return this.expiry_date < new Date();
  }

  get isExpiringSoon(): boolean {
    if (!this.expiry_date) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return this.expiry_date <= threeDaysFromNow && !this.isExpired;
  }

  get needsSync(): boolean {
    return this.sync_status === 'pending';
  }
}

// Default export for compatibility
export default PantryItem;
