// Main exports for the storage facade
export { StorageFacade, storageFacade } from "./storage-facade";
export {
  StorageFactory,
  createMMKVStorage,
  createAsyncStorage,
} from "./storage-factory";

export type { IStorage, StorageConfig, StorageType } from "./storage-types";
export { StorageError, JSONSerializer } from "./storage-types";

// Implementation exports (for advanced usage)
export { AsyncStorageImpl } from "./implementations/async-storage-impl";
