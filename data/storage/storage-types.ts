// Core storage interface that all storage implementations must follow
export interface IStorage {
  // Basic key-value operations
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  contains(key: string): boolean;
  clear(): void;

  // String operations (for backward compatibility)
  getString(key: string): string | null;
  setString(key: string, value: string): void;

  // Async operations (for databases that require async)
  getAsync?<T>(key: string): Promise<T | null>;
  setAsync?<T>(key: string, value: T): Promise<void>;
  deleteAsync?(key: string): Promise<void>;
  clearAsync?(): Promise<void>;

  // Batch operations for efficiency
  getBatch?<T>(keys: string[]): Record<string, T | null>;
  setBatch?<T>(data: Record<string, T>): void;
  deleteBatch?(keys: string[]): void;

  // Metadata
  getAllKeys?(): string[];
  size?(): number;
}

// Storage configuration
export interface StorageConfig {
  type: StorageType;
  options?: Record<string, any>;
}

export type StorageType = "mmkv" | "async-storage";

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
