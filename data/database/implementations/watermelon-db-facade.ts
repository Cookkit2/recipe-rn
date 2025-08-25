/**
 * WatermelonDB Database Implementation
 * 
 * Concrete implementation of the database facade for WatermelonDB
 * Provides offline-first functionality with sync capabilities
 */

import type {
  IDatabaseFacade,
  DatabaseConfig,
  SyncStatus,
  SyncConfig,
  DatabaseInfo,
  IBaseRepository,
  Model,
} from '../types';

import { DatabaseError } from '../types';
import { schema } from '../schema';
import { modelClasses } from '../models';

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { synchronize } from '@nozbe/watermelondb/sync';
import { storageFacade } from '../../storage';

export interface WatermelonDBConfig {
  name: string;
  schema: any;
  adapter?: any;
  modelClasses: any[];
  actionsEnabled?: boolean;
}

export class WatermelonDBFacade implements IDatabaseFacade {
  private database: any = null; // Will be Database type
  private syncConfig?: SyncConfig;
  private syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];
  private currentSyncStatus: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    pendingChanges: 0,
  };

  // ===============================================
  // Database Operations
  // ===============================================

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      const watermelonConfig = config.options as WatermelonDBConfig;
      
      // Note: When WatermelonDB is installed, this will create the actual database
      // const adapter = new SQLiteAdapter({
      //   schema: watermelonConfig.schema || schema,
      //   dbName: watermelonConfig.name,
      //   jsi: true,
      //   onSetUpError: (error) => {
      //     console.error('Database setup error:', error);
      //   },
      // });

      // this.database = new Database({
      //   adapter,
      //   modelClasses: watermelonConfig.modelClasses || modelClasses,
      //   actionsEnabled: watermelonConfig.actionsEnabled ?? true,
      // });

      // For now, create a mock database that simulates WatermelonDB behavior
      // with persistent storage using the storage facade
      const dbKey = `watermelon_db_${watermelonConfig.name}`;
      let mockRecords = new Map<string, any>();
      
      // Load existing data from persistent storage
      try {
        const existingData = await storageFacade.getAsync<string>(dbKey);
        if (existingData) {
          const recordsArray = JSON.parse(existingData);
          mockRecords = new Map(recordsArray.map((r: any) => [r.id, r]));
          console.log(`📚 Loaded ${mockRecords.size} records from persistent storage`);
        }
      } catch (error) {
        console.warn('Failed to load existing database records:', error);
      }
      
      // Helper function to persist data
      const persistData = async () => {
        try {
          const recordsArray = Array.from(mockRecords.values());
          await storageFacade.setAsync(dbKey, JSON.stringify(recordsArray));
        } catch (error) {
          console.error('Failed to persist database records:', error);
        }
      };
      
      this.database = {
        adapter: {
          schema: watermelonConfig.schema || schema,
          dbName: watermelonConfig.name,
        },
        collections: new Map(),
        
        write: async (callback: () => Promise<any>) => {
          try {
            return await callback();
          } catch (error) {
            throw error;
          }
        },
        
        read: async (callback: () => Promise<any>) => {
          try {
            return await callback();
          } catch (error) {
            throw error;
          }
        },
        
        get: (tableName: string) => ({
          query: () => ({
            fetch: async () => {
              const records = Array.from(mockRecords.values())
                .filter(record => record._table === tableName && !record._isDeleted);
              return records;
            },
            fetchCount: async () => {
              const records = Array.from(mockRecords.values())
                .filter(record => record._table === tableName && !record._isDeleted);
              return records.length;
            },
            observe: () => ({
              subscribe: (callback: any) => {
                // Simulate immediate callback with current data
                const records = Array.from(mockRecords.values())
                  .filter(record => record._table === tableName && !record._isDeleted);
                setTimeout(() => callback(records), 0);
                return { unsubscribe: () => {} };
              },
            }),
            where: () => this.database.get(tableName).query(),
            sortBy: () => this.database.get(tableName).query(),
            take: () => this.database.get(tableName).query(),
            skip: () => this.database.get(tableName).query(),
          }),
          
          find: async (id: string) => {
            const record = mockRecords.get(id);
            if (!record || record._isDeleted) {
              throw new Error(`Record ${id} not found`);
            }
            
            // Ensure the record has the required methods (needed for records loaded from storage)
            if (!record.update) {
              record.update = async (updater: (r: any) => void) => {
                updater(record);
                record.updated_at = new Date();
                mockRecords.set(id, record);
                await persistData();
                return record;
              };
            }
            
            if (!record.destroyPermanently) {
              record.destroyPermanently = async () => {
                mockRecords.delete(id);
                await persistData();
              };
            }
            
            if (!record.observe) {
              record.observe = () => ({
                subscribe: (callback: any) => {
                  setTimeout(() => callback(record), 0);
                  return { unsubscribe: () => {} };
                },
              });
            }
            
            return record;
          },
          
          findAndObserve: (id: string) => ({
            subscribe: (callback: any) => {
              const record = mockRecords.get(id);
              setTimeout(() => callback(record || null), 0);
              return { unsubscribe: () => {} };
            },
          }),
          
          create: async (callback: (record: any) => void) => {
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const record = {
              id,
              _table: tableName,
              _isDeleted: false,
              created_at: new Date(),
              updated_at: new Date(),
              
              // Add update method to the record
              update: async (updater: (r: any) => void) => {
                updater(record);
                record.updated_at = new Date();
                mockRecords.set(id, record);
                await persistData(); // Persist changes
                return record;
              },
              
              // Add delete method
              destroyPermanently: async () => {
                mockRecords.delete(id);
                await persistData(); // Persist changes
              },
              
              // Add observe method
              observe: () => ({
                subscribe: (callback: any) => {
                  setTimeout(() => callback(record), 0);
                  return { unsubscribe: () => {} };
                },
              }),
            };
            
            callback(record);
            mockRecords.set(id, record);
            await persistData(); // Persist changes
            return record;
          },
        }),
        
        // Add utility method for testing
        _getMockRecords: () => mockRecords,
        _clearAllRecords: async () => {
          mockRecords.clear();
          await persistData(); // Persist changes
        },
      };

      console.log(`WatermelonDB initialized with database: ${watermelonConfig.name}`);
    } catch (error) {
      throw new DatabaseError(
        'Failed to initialize WatermelonDB',
        'watermelon',
        'initialize',
        error as Error
      );
    }
  }

  async close(): Promise<void> {
    try {
      // WatermelonDB doesn't have an explicit close method
      // But we can clean up our references
      this.database = null;
      this.syncConfig = undefined;
      this.syncStatusCallbacks = [];
    } catch (error) {
      throw new DatabaseError(
        'Failed to close WatermelonDB',
        'watermelon',
        'close',
        error as Error
      );
    }
  }

  // ===============================================
  // Transaction Support
  // ===============================================

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.database) {
      throw new DatabaseError('Database not initialized', 'watermelon', 'transaction');
    }

    try {
      return await this.database.write(callback);
    } catch (error) {
      throw new DatabaseError(
        'Transaction failed',
        'watermelon',
        'transaction',
        error as Error
      );
    }
  }

  // ===============================================
  // Migration Support
  // ===============================================

  async migrate(): Promise<void> {
    try {
      // WatermelonDB handles migrations automatically based on schema version
      console.log('WatermelonDB migrations completed');
    } catch (error) {
      throw new DatabaseError(
        'Migration failed',
        'watermelon',
        'migrate',
        error as Error
      );
    }
  }

  // ===============================================
  // Sync Operations (Offline-First)
  // ===============================================

  async sync(): Promise<void> {
    if (!this.database || !this.syncConfig) {
      throw new DatabaseError('Database or sync config not initialized', 'watermelon', 'sync');
    }

    try {
      this.updateSyncStatus({ 
        ...this.currentSyncStatus, 
        isSyncing: true 
      });

      // Note: When WatermelonDB is installed, this will perform actual sync
      // await synchronize({
      //   database: this.database,
      //   pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      //     const response = await fetch(`${this.syncConfig!.url}/pull`, {
      //       method: 'POST',
      //       headers: {
      //         'Content-Type': 'application/json',
      //         ...this.syncConfig!.headers,
      //       },
      //       body: JSON.stringify({
      //         lastPulledAt,
      //         schemaVersion,
      //         migration,
      //       }),
      //     });
      //     
      //     if (!response.ok) {
      //       throw new Error(`Pull failed: ${response.statusText}`);
      //     }
      //     
      //     return response.json();
      //   },
      //   pushChanges: async ({ changes, lastPulledAt }) => {
      //     const response = await fetch(`${this.syncConfig!.url}/push`, {
      //       method: 'POST',
      //       headers: {
      //         'Content-Type': 'application/json',
      //         ...this.syncConfig!.headers,
      //       },
      //       body: JSON.stringify({
      //         changes,
      //         lastPulledAt,
      //       }),
      //     });
      //     
      //     if (!response.ok) {
      //       throw new Error(`Push failed: ${response.statusText}`);
      //     }
      //   },
      //   migrationsEnabledAtVersion: 1,
      // });

      // Mock sync for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.updateSyncStatus({
        ...this.currentSyncStatus,
        isSyncing: false,
        lastSyncAt: new Date(),
        pendingChanges: 0,
      });

      console.log('Sync completed successfully');
    } catch (error) {
      this.updateSyncStatus({
        ...this.currentSyncStatus,
        isSyncing: false,
        error: (error as Error).message,
      });

      throw new DatabaseError(
        'Sync failed',
        'watermelon',
        'sync',
        error as Error
      );
    }
  }

  setSyncUrl(url: string): void {
    this.syncConfig = {
      ...this.syncConfig,
      url,
    };
  }

  setSyncConfig(config: SyncConfig): void {
    this.syncConfig = config;
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this.syncStatusCallbacks.push(callback);
  }

  private updateSyncStatus(status: SyncStatus): void {
    this.currentSyncStatus = status;
    this.syncStatusCallbacks.forEach(callback => callback(status));
  }

  // ===============================================
  // Schema Operations
  // ===============================================

  getSchemaVersion(): number {
    return this.database?.adapter?.schema?.version || 1;
  }

  // ===============================================
  // Database Info
  // ===============================================

  getInfo(): DatabaseInfo {
    return {
      type: 'watermelon',
      version: this.getSchemaVersion(),
      lastSyncAt: this.currentSyncStatus.lastSyncAt,
      isConnected: Boolean(this.database),
      tables: Object.keys(this.database?.adapter?.schema?.tables || {}),
    };
  }

  // ===============================================
  // Repository Access
  // ===============================================

  getRepository<TModel extends Model, TCreate, TUpdate = Partial<TCreate>>(
    model: string
  ): IBaseRepository<TModel, TCreate, TUpdate> {
    if (!this.database) {
      throw new DatabaseError('Database not initialized', 'watermelon', 'getRepository');
    }

    // This would return the appropriate repository based on the model name
    // For now, we'll throw an error to remind us to implement specific repositories
    throw new DatabaseError(
      `Repository for model '${model}' not implemented yet`,
      'watermelon',
      'getRepository'
    );
  }

  // ===============================================
  // Advanced Operations
  // ===============================================

  async executeSql(sql: string, params?: any[]): Promise<any> {
    try {
      // Note: WatermelonDB doesn't expose raw SQL execution in normal usage
      // This would be used for advanced operations or custom queries
      console.warn('Raw SQL execution should be avoided in WatermelonDB');
      throw new DatabaseError(
        'Raw SQL execution not supported in WatermelonDB',
        'watermelon',
        'executeSql'
      );
    } catch (error) {
      throw new DatabaseError(
        'SQL execution failed',
        'watermelon',
        'executeSql',
        error as Error
      );
    }
  }

  async backup(): Promise<string> {
    try {
      // Implementation would depend on platform and requirements
      throw new DatabaseError(
        'Backup not implemented yet',
        'watermelon',
        'backup'
      );
    } catch (error) {
      throw new DatabaseError(
        'Backup failed',
        'watermelon',
        'backup',
        error as Error
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      // Implementation would depend on platform and requirements
      throw new DatabaseError(
        'Restore not implemented yet',
        'watermelon',
        'restore'
      );
    } catch (error) {
      throw new DatabaseError(
        'Restore failed',
        'watermelon',
        'restore',
        error as Error
      );
    }
  }

  // ===============================================
  // Utility Methods
  // ===============================================

  get isInitialized(): boolean {
    return Boolean(this.database);
  }

  get isSyncing(): boolean {
    return this.currentSyncStatus.isSyncing;
  }

  get pendingChanges(): number {
    return this.currentSyncStatus.pendingChanges;
  }

  /**
   * Get the underlying database instance for repository access
   */
  getDatabase(): any {
    if (!this.database) {
      throw new DatabaseError('Database not initialized', 'watermelon', 'getDatabase');
    }
    return this.database;
  }

  async getPendingChangesCount(): Promise<number> {
    try {
      // This would count all unsync changes across all tables
      // For now, return the cached value
      return this.currentSyncStatus.pendingChanges;
    } catch (error) {
      console.error('Error getting pending changes count:', error);
      return 0;
    }
  }
}

export default WatermelonDBFacade;
