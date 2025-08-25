/**
 * Database Factory
 * 
 * Factory for creating and managing database instances
 * Supports multiple SQL database implementations (WatermelonDB, SQLite, etc.)
 */

import type {
  IDatabaseFacade,
  DatabaseConfig,
  DatabaseType,
} from './types';

import { DatabaseError } from './types';
import WatermelonDBFacade from './implementations/watermelon-db-facade';

export class DatabaseFactory {
  private static instance: IDatabaseFacade | null = null;
  private static currentConfig: DatabaseConfig | null = null;

  // ===============================================
  // Factory Methods
  // ===============================================

  static async initialize(config: DatabaseConfig): Promise<IDatabaseFacade> {
    try {
      if (this.instance) {
        await this.instance.close();
      }

      this.instance = this.createDatabase(config);
      await this.instance.initialize(config);
      this.currentConfig = config;

      console.log(`Database initialized: ${config.type}`);
      return this.instance;
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${config.type}`,
        config.type,
        'initialize',
        error as Error
      );
    }
  }

  static getInstance(): IDatabaseFacade {
    if (!this.instance) {
      throw new DatabaseError(
        'Database not initialized. Call DatabaseFactory.initialize() first.',
        'watermelon', // default type
        'getInstance'
      );
    }
    return this.instance;
  }

  static getCurrentConfig(): DatabaseConfig | null {
    return this.currentConfig;
  }

  static async switchDatabase(newConfig: DatabaseConfig): Promise<IDatabaseFacade> {
    if (this.instance) {
      console.log(`Switching from ${this.currentConfig?.type} to ${newConfig.type}`);
      await this.instance.close();
    }

    return this.initialize(newConfig);
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      this.currentConfig = null;
    }
  }

  // ===============================================
  // Database Creation
  // ===============================================

  private static createDatabase(config: DatabaseConfig): IDatabaseFacade {
    switch (config.type) {
      case 'watermelon':
        return new WatermelonDBFacade();
      
      case 'sqlite':
        // TODO: Implement SQLite facade
        throw new DatabaseError(
          'SQLite implementation not available yet',
          'sqlite',
          'create'
        );
      
      case 'realm-sql':
        // TODO: Implement Realm SQL facade
        throw new DatabaseError(
          'Realm SQL implementation not available yet',
          'realm-sql',
          'create'
        );
      
      default:
        throw new DatabaseError(
          `Unsupported database type: ${config.type}`,
          config.type,
          'create'
        );
    }
  }

  // ===============================================
  // Migration Support
  // ===============================================

  static async migrateDatabase(
    fromConfig: DatabaseConfig,
    toConfig: DatabaseConfig,
    tablesToMigrate?: string[]
  ): Promise<void> {
    try {
      console.log(`Migrating from ${fromConfig.type} to ${toConfig.type}`);

      // Initialize source database
      const sourceDb = this.createDatabase(fromConfig);
      await sourceDb.initialize(fromConfig);

      // Initialize target database
      const targetDb = this.createDatabase(toConfig);
      await targetDb.initialize(toConfig);

      // Perform migration
      // Note: This is a simplified implementation
      // Real migration would need to handle schema differences, data transformation, etc.
      
      if (tablesToMigrate) {
        for (const tableName of tablesToMigrate) {
          console.log(`Migrating table: ${tableName}`);
          // Implementation would go here
        }
      }

      // Close source database
      await sourceDb.close();

      // Update current instance
      if (this.instance) {
        await this.instance.close();
      }
      this.instance = targetDb;
      this.currentConfig = toConfig;

      console.log('Migration completed successfully');
    } catch (error) {
      throw new DatabaseError(
        'Database migration failed',
        toConfig.type,
        'migrate',
        error as Error
      );
    }
  }

  // ===============================================
  // Convenience Methods
  // ===============================================

  static async createWatermelonDB(options: {
    name: string;
    schema?: any;
    modelClasses?: any[];
    actionsEnabled?: boolean;
  }): Promise<IDatabaseFacade> {
    const config: DatabaseConfig = {
      type: 'watermelon',
      options,
    };
    return this.initialize(config);
  }

  static async createSQLiteDB(options: {
    name: string;
    schema?: any;
    version?: number;
  }): Promise<IDatabaseFacade> {
    const config: DatabaseConfig = {
      type: 'sqlite',
      options,
    };
    return this.initialize(config);
  }

  // ===============================================
  // Utility Methods
  // ===============================================

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  static getDatabaseType(): DatabaseType | null {
    return this.currentConfig?.type || null;
  }

  static async healthCheck(): Promise<{
    isHealthy: boolean;
    type: DatabaseType | null;
    error?: string;
  }> {
    try {
      if (!this.instance) {
        return {
          isHealthy: false,
          type: null,
          error: 'Database not initialized',
        };
      }

      const info = this.instance.getInfo();
      return {
        isHealthy: info.isConnected,
        type: info.type,
      };
    } catch (error) {
      return {
        isHealthy: false,
        type: this.currentConfig?.type || null,
        error: (error as Error).message,
      };
    }
  }

  // ===============================================
  // Development Helpers
  // ===============================================

  static async reset(): Promise<void> {
    if (this.instance) {
      try {
        // Clear all data
        const info = this.instance.getInfo();
        for (const tableName of info.tables) {
          const repository = this.instance.getRepository(tableName);
          await repository.clear();
        }
        console.log('Database reset completed');
      } catch (error) {
        console.error('Error during database reset:', error);
        throw error;
      }
    }
  }

  static getDebugInfo(): object {
    return {
      isInitialized: this.isInitialized(),
      currentConfig: this.currentConfig,
      databaseInfo: this.instance?.getInfo() || null,
    };
  }
}

// ===============================================
// Convenience exports
// ===============================================

export const createWatermelonDatabase = DatabaseFactory.createWatermelonDB;
export const createSQLiteDatabase = DatabaseFactory.createSQLiteDB;

export default DatabaseFactory;
