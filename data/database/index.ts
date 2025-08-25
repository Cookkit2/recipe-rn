/**
 * Database System Main Export
 * 
 * Central export point for the SQL database facade system
 * Designed for offline-first applications with sync capabilities
 */

// ===============================================
// Main Facade and Factory
// ===============================================
export { default as databaseFacade, DatabaseFacade } from './database-facade';
export { default as DatabaseFactory, createWatermelonDatabase, createSQLiteDatabase } from './database-factory';

// ===============================================
// Schema and Models (import for use in configs)
// ===============================================
import { schema } from './schema';
import { modelClasses } from './models';
import { databaseFacade } from './database-facade';
import type { DatabaseConfig } from './types';
import { DatabaseError } from './types';

// ===============================================
// Types
// ===============================================
export type {
  IDatabaseFacade,
  IBaseRepository,
  DatabaseConfig,
  DatabaseType,
  QueryOptions,
  QueryCondition,
  SortOption,
  PaginationOptions,
  PaginatedResult,
  SyncStatus,
  SyncConfig,
  DatabaseInfo,
  Observable,
  Subscription,
  CreateInput,
  UpdateInput,
  BaseModelInterface,
} from './types';

export {
  DatabaseError,
  QueryError,
  ValidationError,
} from './types';

// ===============================================
// Models
// ===============================================
export type {
  PantryItem,
  PantryItemModel,
  TableName,
} from './models';

export {
  modelClasses,
  TABLE_NAMES,
} from './models';

// ===============================================
// Repositories
// ===============================================
export { default as BaseRepository } from './repositories/base-repository';
export { default as PantryItemRepository } from './repositories/pantry-item-repository';

export type {
  CreatePantryItemData,
  UpdatePantryItemData,
} from './repositories/pantry-item-repository';

// ===============================================
// Schema
// ===============================================
export { schema } from './schema';

// ===============================================
// Implementations
// ===============================================
export { default as WatermelonDBFacade } from './implementations/watermelon-db-facade';

// ===============================================
// Configuration Helpers
// ===============================================

/**
 * Database configuration presets for common use cases
 */
export const databaseConfigs = {
  // Development configuration with WatermelonDB
  development: {
    type: 'watermelon' as const,
    options: {
      name: 'recipe_app_dev.db',
      schema,
      modelClasses,
      actionsEnabled: true,
    },
  },

  // Production configuration with WatermelonDB
  production: {
    type: 'watermelon' as const,
    options: {
      name: 'recipe_app.db',
      schema,
      modelClasses,
      actionsEnabled: false,
    },
  },

  // Testing configuration with in-memory database
  testing: {
    type: 'watermelon' as const,
    options: {
      name: ':memory:',
      schema,
      modelClasses,
      actionsEnabled: true,
    },
  },
} as const;

/**
 * Get database configuration based on environment
 */
export function getDatabaseConfig(env: 'development' | 'production' | 'testing' = 'development') {
  return databaseConfigs[env];
}

/**
 * Initialize database with environment-appropriate configuration
 */
export async function initializeDatabase(env?: 'development' | 'production' | 'testing') {
  const config = getDatabaseConfig(env);
  await databaseFacade.initialize(config);
  return databaseFacade;
}

/**
 * Create a WatermelonDB instance with custom options
 */
export async function createWatermelonDB(options: {
  name: string;
  schema?: any;
  modelClasses?: any[];
  actionsEnabled?: boolean;
  syncUrl?: string;
}) {
  const config = {
    type: 'watermelon' as const,
    options: {
      schema,
      modelClasses,
      ...options,
    },
  };

  await databaseFacade.initialize(config);

  if (options.syncUrl) {
    databaseFacade.setSyncUrl(options.syncUrl);
  }

  return databaseFacade;
}

// ===============================================
// Migration Helpers
// ===============================================

/**
 * Migrate from key-value storage to SQL database
 */
export async function migrateFromKeyValueStorage(
  keyValueData: Record<string, any>,
  targetConfig?: DatabaseConfig
) {
  const config = targetConfig || getDatabaseConfig('production');
  await databaseFacade.initialize(config);

  // Migrate pantry items
  if (keyValueData.pantryItems) {
    const pantryRepo = databaseFacade.pantryItems;
    for (const item of keyValueData.pantryItems) {
      await pantryRepo.create({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: item.expiry_date ? new Date(item.expiry_date) : undefined,
        category: item.category,
        type: item.type,
        image_url: item.image_url,
        x: item.x || 0,
        y: item.y || 0,
        scale: item.scale || 1,
      });
    }
  }

  // TODO: Migrate other data types
  console.log('Migration from key-value storage completed');
}

// ===============================================
// Utility Functions
// ===============================================

/**
 * Check if database is ready for use
 */
export function isDatabaseReady(): boolean {
  return databaseFacade.isInitialized;
}

/**
 * Get database status information
 */
export async function getDatabaseStatus() {
  if (!databaseFacade.isInitialized) {
    return {
      initialized: false,
      healthy: false,
      error: 'Database not initialized',
    };
  }

  const healthCheck = await databaseFacade.healthCheck();
  const info = databaseFacade.getInfo();

  return {
    initialized: true,
    healthy: healthCheck.isHealthy,
    type: info.type,
    version: info.version,
    tables: info.tables,
    lastSyncAt: info.lastSyncAt,
    debugInfo: databaseFacade.getDebugInfo(),
    error: healthCheck.error,
  };
}

/**
 * Perform database maintenance operations
 */
export async function performMaintenance() {
  if (!databaseFacade.isInitialized) {
    throw new DatabaseError('Database not initialized', 'watermelon', 'maintenance');
  }

  // Run migrations
  await databaseFacade.migrate();

  // Sync with remote if configured
  try {
    await databaseFacade.sync();
  } catch (error) {
    console.warn('Sync failed during maintenance:', error);
  }

  console.log('Database maintenance completed');
}

export default databaseFacade;
