/**
 * PantryItem Repository for WatermelonDB
 * 
 * Repository implementation for managing pantry items
 * with enhanced query capabilities for the recipe app
 */

import { BaseRepository } from './base-repository';
import type { QueryOptions } from '../types';
import type { PantryItem, PantryItemModel } from '../models/PantryItem';
import type { ItemType } from '../../../types/PantryItem';
import { TABLE_NAMES } from '../models';

// Create and Update types for PantryItem
export interface CreatePantryItemData {
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
}

export type UpdatePantryItemData = Partial<CreatePantryItemData>;

export class PantryItemRepository extends BaseRepository<PantryItem, CreatePantryItemData, UpdatePantryItemData> {
  protected tableName = TABLE_NAMES.PANTRY_ITEMS;
  protected database: any; // Will be Database type when WatermelonDB is installed

  constructor(database: any) {
    super();
    this.database = database;
  }

  // ===============================================
  // Repository Implementation
  // ===============================================

  protected getCollection() {
    return this.database.get(this.tableName);
  }

  protected async createModel(data: CreatePantryItemData): Promise<PantryItem> {
    const collection = this.getCollection();
    return await collection.create((pantryItem: any) => {
      pantryItem.name = data.name;
      pantryItem.quantity = data.quantity;
      pantryItem.unit = data.unit;
      pantryItem.expiry_date = data.expiry_date;
      pantryItem.category = data.category;
      pantryItem.type = data.type;
      pantryItem.image_url = data.image_url;
      pantryItem.x = data.x;
      pantryItem.y = data.y;
      pantryItem.scale = data.scale;
      pantryItem.created_at = new Date();
      pantryItem.updated_at = new Date();
      pantryItem.sync_status = 'pending';
    });
  }

  protected async updateModel(model: PantryItem, data: UpdatePantryItemData): Promise<PantryItem> {
    return await model.update((pantryItem: any) => {
      if (data.name !== undefined) pantryItem.name = data.name;
      if (data.quantity !== undefined) pantryItem.quantity = data.quantity;
      if (data.unit !== undefined) pantryItem.unit = data.unit;
      if (data.expiry_date !== undefined) pantryItem.expiry_date = data.expiry_date;
      if (data.category !== undefined) pantryItem.category = data.category;
      if (data.type !== undefined) pantryItem.type = data.type;
      if (data.image_url !== undefined) pantryItem.image_url = data.image_url;
      if (data.x !== undefined) pantryItem.x = data.x;
      if (data.y !== undefined) pantryItem.y = data.y;
      if (data.scale !== undefined) pantryItem.scale = data.scale;
      
      pantryItem.updated_at = new Date();
      pantryItem.sync_status = 'pending';
    });
  }

  protected async deleteModel(model: PantryItem): Promise<void> {
    // For WatermelonDB, we would use markAsDeleted()
    // For our mock database, we'll use the destroyPermanently method
    if ((model as any).destroyPermanently) {
      await (model as any).destroyPermanently();
    } else {
      // Fallback: mark as deleted
      await model.update((pantryItem: any) => {
        pantryItem._isDeleted = true;
        pantryItem.sync_status = 'pending';
        pantryItem.updated_at = new Date();
      });
    }
  }

  // ===============================================
  // Enhanced Query Methods
  // ===============================================

  /**
   * Find items by type (fridge, cabinet, freezer)
   */
  async findByType(type: Exclude<ItemType, "all">): Promise<PantryItem[]> {
    return this.findAll({
      where: [{ field: 'type', operator: 'eq', value: type }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    });
  }

  /**
   * Find items by category
   */
  async findByCategory(category: string): Promise<PantryItem[]> {
    return this.findAll({
      where: [{ field: 'category', operator: 'eq', value: category }],
      orderBy: [{ field: 'expiry_date', direction: 'asc' }],
    });
  }

  /**
   * Search items by name
   */
  async searchByName(searchTerm: string): Promise<PantryItem[]> {
    return this.findAll({
      where: [{ field: 'name', operator: 'like', value: `%${searchTerm}%` }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    });
  }

  /**
   * Find items expiring soon (within specified days)
   */
  async findExpiringSoon(days: number = 3): Promise<PantryItem[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.findAll({
      where: [
        { field: 'expiry_date', operator: 'lte', value: futureDate.getTime() },
        { field: 'expiry_date', operator: 'gte', value: new Date().getTime() },
      ],
      orderBy: [{ field: 'expiry_date', direction: 'asc' }],
    });
  }

  /**
   * Find expired items
   */
  async findExpired(): Promise<PantryItem[]> {
    return this.findAll({
      where: [{ field: 'expiry_date', operator: 'lt', value: new Date().getTime() }],
      orderBy: [{ field: 'expiry_date', direction: 'desc' }],
    });
  }

  /**
   * Find items with low quantity (less than specified amount)
   */
  async findLowQuantity(threshold: number = 1): Promise<PantryItem[]> {
    return this.findAll({
      where: [{ field: 'quantity', operator: 'lte', value: threshold }],
      orderBy: [{ field: 'quantity', direction: 'asc' }],
    });
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    const items = await this.findAll();
    const categorySet = new Set(items.map(item => item.category));
    const categories = Array.from(categorySet);
    return categories.sort();
  }

  /**
   * Get items grouped by type
   */
  async getItemsByType(): Promise<Record<Exclude<ItemType, "all">, PantryItem[]>> {
    const allItems = await this.findAll({
      orderBy: [{ field: 'name', direction: 'asc' }],
    });

    return {
      fridge: allItems.filter(item => item.type === 'fridge'),
      cabinet: allItems.filter(item => item.type === 'cabinet'),
      freezer: allItems.filter(item => item.type === 'freezer'),
    };
  }

  /**
   * Update item quantity
   */
  async updateQuantity(id: string, newQuantity: number): Promise<PantryItem> {
    return this.update(id, { quantity: newQuantity });
  }

  /**
   * Mark item as used/consumed (decrease quantity)
   */
  async consumeItem(id: string, amount: number = 1): Promise<PantryItem | null> {
    const item = await this.findById(id);
    if (!item) return null;

    const newQuantity = Math.max(0, item.quantity - amount);
    return this.updateQuantity(id, newQuantity);
  }

  /**
   * Add stock to item (increase quantity)
   */
  async addStock(id: string, amount: number): Promise<PantryItem | null> {
    const item = await this.findById(id);
    if (!item) return null;

    const newQuantity = item.quantity + amount;
    return this.updateQuantity(id, newQuantity);
  }

  /**
   * Get statistics about pantry items
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<Exclude<ItemType, "all">, number>;
    expiringSoon: number;
    expired: number;
    lowQuantity: number;
  }> {
    const [total, byType, expiringSoon, expired, lowQuantity] = await Promise.all([
      this.count(),
      this.getItemsByType(),
      this.findExpiringSoon(),
      this.findExpired(),
      this.findLowQuantity(),
    ]);

    return {
      total,
      byType: {
        fridge: byType.fridge.length,
        cabinet: byType.cabinet.length,
        freezer: byType.freezer.length,
      },
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      lowQuantity: lowQuantity.length,
    };
  }

  /**
   * Convert WatermelonDB model to plain object for compatibility
   */
  async findByIdAsPlainObject(id: string): Promise<import('../../../types/PantryItem').PantryItem | null> {
    const item = await this.findById(id);
    return item ? item.toPlainObject() as any : null;
  }

  /**
   * Convert all items to plain objects
   */
  async findAllAsPlainObjects(options?: QueryOptions): Promise<import('../../../types/PantryItem').PantryItem[]> {
    const items = await this.findAll(options);
    return items.map(item => item.toPlainObject()) as any;
  }

  // ===============================================
  // Sync-related methods
  // ===============================================

  /**
   * Find items that need to be synced
   */
  async findPendingSync(): Promise<PantryItem[]> {
    return this.findAll({
      where: [{ field: 'sync_status', operator: 'eq', value: 'pending' }],
    });
  }

  /**
   * Mark items as synced
   */
  async markAsSynced(ids: string[]): Promise<void> {
    await this.database.write(async () => {
      const promises = ids.map(async (id) => {
        const item = await this.findById(id);
        if (item) {
          return item.update((pantryItem: any) => {
            pantryItem.sync_status = 'synced';
            pantryItem.last_synced_at = new Date();
          });
        }
      });
      await Promise.all(promises);
    });
  }
}

export default PantryItemRepository;
