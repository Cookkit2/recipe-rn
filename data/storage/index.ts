// Main exports for the storage facade
export { StorageFacade, storageFacade } from "./storage-facade";
export {
  StorageFactory,
  // createMMKVStorage, // Commented out for Expo Go compatibility
  createAsyncStorage,
  createSQLiteStorage,
  createWatermelonStorage,
  createRealmStorage,
} from "./storage-factory";
export type { IStorage, StorageConfig, StorageType } from "./types";
export { StorageError, JSONSerializer } from "./types";

// Implementation exports (for advanced usage)
// export { MMKVStorage } from "./implementations/mmkv-storage"; // Commented out for Expo Go compatibility
export { AsyncStorageImpl } from "./implementations/async-storage-impl";
export { SQLiteStorage } from "./implementations/sqlite-storage";
export { WatermelonStorage } from "./implementations/watermelon-storage";
export { RealmStorage } from "./implementations/realm-storage";
