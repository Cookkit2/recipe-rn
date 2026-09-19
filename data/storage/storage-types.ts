// ===== CORE INTERFACES (Interface Segregation Principle) =====

// Basic read operations
export interface IReadableStorage {
  get<T>(key: string): T | null;
  getString(key: string): string | null;
  contains(key: string): boolean;
}

// Basic write operations
export interface IWritableStorage {
  set<T>(key: string, value: T): void;
  setString(key: string, value: string): void;
  delete(key: string): void;
  clear(): void;
}

// Metadata operations
export interface IStorageMetadata {
  getAllKeys(): string[];
  size(): number;
}

// Batch operations for efficiency
export interface IBatchStorage {
  getBatch<T>(keys: string[]): Record<string, T | null>;
  setBatch<T>(data: Record<string, T>): void;
  deleteBatch(keys: string[]): void;
}

// ===== ASYNC INTERFACES (Minimal for AsyncStorage) =====

// Core async read operations (minimal interface for AsyncStorage)
export interface IAsyncReadableStorage {
  getAsync<T>(key: string): Promise<T | null>;
  getStringAsync?(key: string): Promise<string | null>;
}

// Core async write operations (minimal interface for AsyncStorage)
export interface IAsyncWritableStorage {
  setAsync<T>(key: string, value: T): Promise<void>;
  setStringAsync?(key: string, value: string): Promise<void>;
  deleteAsync(key: string): Promise<void>;
  clearAsync(): Promise<void>;
}

// Optional async metadata operations
export interface IAsyncStorageMetadata {
  getAllKeysAsync(): Promise<string[]>;
  sizeAsync(): Promise<number>;
}

// Optional async batch operations
export interface IAsyncBatchStorage {
  getBatchAsync<T>(keys: string[]): Promise<Record<string, T | null>>;
  setBatchAsync<T>(data: Record<string, T>): Promise<void>;
  deleteBatchAsync(keys: string[]): Promise<void>;
}

// Optional capability detection: storage may implement these for async/batch support
export interface IStorageCapabilities {
  getAsync?<T>(key: string): Promise<T | null>;
  setAsync?<T>(key: string, value: T): Promise<void>;
  deleteAsync?(key: string): Promise<void>;
  clearAsync?(): Promise<void>;
  getBatch?(keys: string[]): Record<string, unknown>;
  setBatch?<T>(data: Record<string, T>): void;
  deleteBatch?(keys: string[]): void;
  getAllKeys?(): string[];
  size?(): number;
}

// ===== COMPOSITE INTERFACES =====

// Full synchronous storage interface (for MMKV, etc.)
export interface ISyncStorage
  extends IReadableStorage, IWritableStorage, IStorageMetadata, IBatchStorage {}

// Minimal async storage interface (for AsyncStorage - only essential operations)
export interface IAsyncStorage extends IAsyncReadableStorage, IAsyncWritableStorage {}

// Full async storage interface (for databases that support all async operations)
export interface IFullAsyncStorage
  extends IAsyncStorage, IAsyncStorageMetadata, IAsyncBatchStorage {}

// Unified storage interface (matches StorageFacade API - single method per operation)
export interface IStorage {
  // Core operations - unified API with useAsync parameter
  get<T>(key: string): T | null;
  get<T>(key: string, useAsync: false): T | null;
  get<T>(key: string, useAsync: true): Promise<T | null>;

  set<T>(key: string, value: T): void;
  set<T>(key: string, value: T, useAsync: false): void;
  set<T>(key: string, value: T, useAsync: true): Promise<void>;

  delete(key: string): void;
  delete(key: string, useAsync: false): void;
  delete(key: string, useAsync: true): Promise<void>;

  clear(): void;
  clear(useAsync: false): void;
  clear(useAsync: true): Promise<void>;

  // String operations
  getString(key: string): string | null;
  getString(key: string, useAsync: false): string | null;
  getString(key: string, useAsync: true): Promise<string | null>;

  setString(key: string, value: string): void;
  setString(key: string, value: string, useAsync: false): void;
  setString(key: string, value: string, useAsync: true): Promise<void>;

  // Metadata operations
  contains(key: string): boolean;
  getAllKeys(): string[];
  size(): number;

  // Batch operations
  getBatch<T>(keys: string[]): Record<string, T | null>;
  setBatch<T>(data: Record<string, T>): void;
  deleteBatch(keys: string[]): void;

  // Storage info
  getInfo(): {
    type: string;
    size: string | number;
    supportsAsync: boolean;
    supportsBatch: boolean;
    keys: string | string[];
    isAsync: boolean;
  };
}

// Storage configuration
export interface StorageConfig {
  type: StorageType;
  options?: Record<string, any>;
}

export type StorageType = "mmkv";

// Error types
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly storageType: StorageType
  ) {
    super(message);
    this.name = "StorageError";
  }
}

// Serialization helpers
export interface ISerializer<T> {
  serialize(value: T): string;
  deserialize(value: string): T;
}

export class JSONSerializer<T> implements ISerializer<T> {
  serialize(value: T): string {
    return JSON.stringify(value);
  }

  deserialize(value: string): T {
    return JSON.parse(value);
  }
}
