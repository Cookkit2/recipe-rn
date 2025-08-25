/**
 * SQL Database Facade Types
 * 
 * Type definitions for SQL-based database operations
 * Designed for WatermelonDB, SQLite, and other relational databases
 */

// WatermelonDB imports
import type { Model, Q, Database, Query } from '@nozbe/watermelondb';

export type { Model, Q, Database, Query };

// ===============================================
// Base Database Types
// ===============================================

export type DatabaseType = 'watermelon' | 'sqlite' | 'realm-sql';

export interface DatabaseConfig {
  type: DatabaseType;
  options?: Record<string, any>;
}

// ===============================================
// Query Types
// ===============================================

export interface QueryCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'notIn' | 'between';
  value: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  where?: QueryCondition[];
  orderBy?: SortOption[];
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ===============================================
// Database Error Types
// ===============================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly databaseType: DatabaseType,
    public readonly operation?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class QueryError extends DatabaseError {
  constructor(
    message: string,
    databaseType: DatabaseType,
    public readonly query?: string,
    originalError?: Error
  ) {
    super(message, databaseType, 'query', originalError);
    this.name = 'QueryError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    databaseType: DatabaseType,
    public readonly validationErrors?: Record<string, string[]>
  ) {
    super(message, databaseType, 'validation');
    this.name = 'ValidationError';
  }
}

// ===============================================
// Repository Interface
// ===============================================

export interface IBaseRepository<TModel, TCreate, TUpdate = Partial<TCreate>> {
  // Basic CRUD operations
  create(data: TCreate): Promise<TModel>;
  createMany(data: TCreate[]): Promise<TModel[]>;
  
  findById(id: string): Promise<TModel | null>;
  findByIds(ids: string[]): Promise<TModel[]>;
  
  update(id: string, data: TUpdate): Promise<TModel>;
  updateMany(ids: string[], data: TUpdate): Promise<TModel[]>;
  
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  
  // Query operations
  findAll(options?: QueryOptions): Promise<TModel[]>;
  findOne(options: QueryOptions): Promise<TModel | null>;
  findMany(options: QueryOptions): Promise<TModel[]>;
  
  // Pagination
  findPaginated(pagination: PaginationOptions, options?: QueryOptions): Promise<PaginatedResult<TModel>>;
  
  // Count operations
  count(options?: QueryOptions): Promise<number>;
  exists(id: string): Promise<boolean>;
  
  // Utility operations
  clear(): Promise<void>;
  
  // Real-time subscriptions (for WatermelonDB)
  observe(options?: QueryOptions): Observable<TModel[]>;
  observeOne(id: string): Observable<TModel | null>;
}

// ===============================================
// Database Interface
// ===============================================

export interface IDatabaseFacade {
  // Database operations
  initialize(config: DatabaseConfig): Promise<void>;
  close(): Promise<void>;
  
  // Transaction support
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  
  // Migration support
  migrate(): Promise<void>;
  
  // Sync operations (for offline-first)
  sync(): Promise<void>;
  setSyncUrl(url: string): void;
  onSyncStatusChange(callback: (status: SyncStatus) => void): void;
  
  // Schema operations
  getSchemaVersion(): number;
  
  // Database info
  getInfo(): DatabaseInfo;
  
  // Repository access
  getRepository<TModel extends Model, TCreate, TUpdate = Partial<TCreate>>(
    model: string
  ): IBaseRepository<TModel, TCreate, TUpdate>;
}

// ===============================================
// Sync Types (for offline-first)
// ===============================================

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: Date;
  pendingChanges: number;
  error?: string;
}

export interface SyncConfig {
  url: string;
  headers?: Record<string, string>;
  pullInterval?: number; // in milliseconds
  pushInterval?: number; // in milliseconds
  batchSize?: number;
}

// ===============================================
// Database Info
// ===============================================

export interface DatabaseInfo {
  type: DatabaseType;
  version: number;
  size?: number;
  lastSyncAt?: Date;
  isConnected: boolean;
  tables: string[];
}

// ===============================================
// WatermelonDB Specific Types
// ===============================================

export interface WatermelonConfig {
  name: string;
  schema: any;
  adapter: any;
  modelClasses: any[];
  actionsEnabled?: boolean;
}

// ===============================================
// Observable Type (for real-time updates)
// ===============================================

export interface Observable<T> {
  subscribe(observer: (value: T) => void): Subscription;
}

export interface Subscription {
  unsubscribe(): void;
}

// ===============================================
// Utility Types
// ===============================================

export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = Partial<CreateInput<T>>;

// ===============================================
// Model Base Interface
// ===============================================

export interface BaseModelInterface {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// ===============================================
// Export all types
// ===============================================

// Re-export the types we defined above
// Note: WatermelonDB types will be properly imported when the package is installed
