/**
 * Main Database Facade
 * 
 * Central access point for all database operations
 * Provides a unified interface for SQL-based databases
 */

import type {
  IDatabaseFacade,
  DatabaseConfig,
  SyncStatus,
  DatabaseInfo,
  IBaseRepository,
  Model,
} from './types';

import { DatabaseError } from './types';
import { DatabaseFactory } from './database-factory';
import { PantryItemRepository } from './repositories/pantry-item-repository';

export class DatabaseFacade implements IDatabaseFacade {
  private factory: typeof DatabaseFactory;
  private repositories: Map<string, any> = new Map();

  constructor() {
    this.factory = DatabaseFactory;
  }

  // ===============================================
  // Database Operations
  // ===============================================

  async initialize(config: DatabaseConfig): Promise<void> {
    await this.factory.initialize(config);
    this.initializeRepositories();
  }

  async close(): Promise<void> {
    await this.factory.close();
    this.repositories.clear();
  }

  // ===============================================
  // Delegate to underlying database
  // ===============================================

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const instance = this.factory.getInstance();
    return instance.transaction(callback);
  }

  async migrate(): Promise<void> {
    const instance = this.factory.getInstance();
    return instance.migrate();
  }

  async sync(): Promise<void> {
    const instance = this.factory.getInstance();
    return instance.sync();
  }

  setSyncUrl(url: string): void {
    const instance = this.factory.getInstance();
    instance.setSyncUrl(url);
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    const instance = this.factory.getInstance();
    instance.onSyncStatusChange(callback);
  }

  getSchemaVersion(): number {
    const instance = this.factory.getInstance();
    return instance.getSchemaVersion();
  }

  getInfo(): DatabaseInfo {
    const instance = this.factory.getInstance();
    return instance.getInfo();
  }

  getRepository<TModel extends Model, TCreate, TUpdate = Partial<TCreate>>(
    model: string
  ): IBaseRepository<TModel, TCreate, TUpdate> {
    const instance = this.factory.getInstance();
    return instance.getRepository(model);
  }

  // ===============================================
  // Repository Access
  // ===============================================

  private initializeRepositories(): void {
    const dbInstance = this.factory.getInstance();
    
    // Get the actual database instance from the facade
    const actualDatabase = (dbInstance as any).getDatabase ? (dbInstance as any).getDatabase() : dbInstance;
    
    // Initialize specific repositories with the actual database
    this.repositories.set('pantryItems', new PantryItemRepository(actualDatabase));
    // TODO: Add other repositories as they're created
    // this.repositories.set('recipes', new RecipeRepository(actualDatabase));
    // this.repositories.set('recipeIngredients', new RecipeIngredientRepository(actualDatabase));
  }

  /**
   * Get PantryItem repository with enhanced methods
   */
  get pantryItems(): PantryItemRepository {
    const repo = this.repositories.get('pantryItems');
    if (!repo) {
      throw new DatabaseError('PantryItem repository not initialized', 'watermelon', 'getRepository');
    }
    return repo;
  }

  // TODO: Add getters for other repositories
  // get recipes(): RecipeRepository { ... }
  // get recipeIngredients(): RecipeIngredientRepository { ... }

  // ===============================================
  // Utility Methods
  // ===============================================

  get isInitialized(): boolean {
    return this.factory.isInitialized();
  }

  get databaseType() {
    return this.factory.getDatabaseType();
  }

  async healthCheck() {
    return this.factory.healthCheck();
  }

  async reset(): Promise<void> {
    return this.factory.reset();
  }

  getDebugInfo(): object {
    return {
      facade: 'DatabaseFacade',
      ...this.factory.getDebugInfo(),
      repositories: Array.from(this.repositories.keys()),
    };
  }
}

// ===============================================
// Singleton Instance
// ===============================================

export const databaseFacade = new DatabaseFacade();

export default databaseFacade;
