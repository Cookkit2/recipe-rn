// Main exports for the storage facade
export { StorageFacade, storageFacade } from "./storage-facade";
export { StorageFactory, createMMKVStorage } from "./storage-factory";

export type { IStorage, StorageConfig, StorageType } from "./storage-types";
export { StorageError, JSONSerializer } from "./storage-types";
